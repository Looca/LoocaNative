/**
* Sample React Native App
* https://github.com/facebook/react-native
* @flow
*/

'use stict';

let React = require('react-native');
let RandManager = require('./RandManager.js');
let Utils = require('./Utils.js');
let Swiper = require('react-native-swiper');
let NetworkImage = require('react-native-image-progress');
let Progress = require('react-native-progress');
let ShakeEvent = require('react-native-shake-event-ios');

let ProgressHUD = require('./ProgressHUD.js');

let {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Component,
  Dimensions,
  PanResponder,
  ActivityIndicatorIOS,
  CameraRoll,
  AlertIOS
} = React;

let {width, height} = Dimensions.get('window');
const NUM_WALLPAPERS = 5;
const DOUBLE_TAP_DELAY = 300; // milliseconds
const DOUBLE_TAP_RADIUS = 20;


class LoocaNative extends Component{
  constructor(props) {
    super(props);

    this.state = {
      wallsJSON: [],
      isLoading: true,
      isHudVisible: false
    };
    this.imagePanResponder = {};


    // Previous touch information
    this.prevTouchInfo = {
      prevTouchX: 0,
      prevTouchY: 0,
      prevTouchTimeStamp: 0
    };

    this.currentWallIndex = 0;

    // Binding this to methods
    this.handlePanResponderGrant = this.handlePanResponderGrant.bind(this);
    this.onMomentumScrollEnd = this.onMomentumScrollEnd.bind(this);

  }
  componentWillMount() {
    this.imagePanResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
      onPanResponderGrant: this.handlePanResponderGrant,
      onPanResponderRelease: this.handlePanResponderEnd,
      onPanResponderTerminate: this.handlePanResponderEnd
    });
    // Fetch new wallpapers on shake
    ShakeEvent.addEventListener('shake', () => {
      this.initialize();
      this.fetchWallsJSON();
    });
  }
  componentDidMount() {
    this.fetchWallsJSON();
  }
  initialize() {
    this.setState({
      wallsJSON: [],
      isLoading: true,
      isHudVisible: false
    });

    this.currentWallIndex = 0;
  }
  fetchWallsJSON() {
    const url = 'http://unsplash.it/list';
    fetch(url)
    .then( response => response.json() )
    .then( jsonData => {
      var randomIds = RandManager.uniqueRandomNumbers(NUM_WALLPAPERS, 0, jsonData.length);
      var walls = [];
      randomIds.forEach(randomId => {
        walls.push(jsonData[randomId]);
      });

      this.setState({
        isLoading: false,
        wallsJSON: [].concat(walls)
      });
    })
    .catch( error => console.log('JSON Fetch error : ' + error) );
  }
  // Pan Handler methods
  handleStartShouldSetPanResponder(e, gestureState){
    return true;
  }

  handlePanResponderGrant(e, gestureState) {
    var currentTouchTimeStamp = Date.now();

    if( this.isDoubleTap(currentTouchTimeStamp, gestureState) )
    this.saveCurrentWallpaperToCameraRoll();

    this.prevTouchInfo = {
      prevTouchX: gestureState.x0,
      prevTouchY: gestureState.y0,
      prevTouchTimeStamp: currentTouchTimeStamp
    };
  }

  handlePanResponderEnd(e, gestureState) {
    // When finger is pulled up from the screen
  }
  isDoubleTap(currentTouchTimeStamp, {x0, y0}) {
    var {prevTouchX, prevTouchY, prevTouchTimeStamp} = this.prevTouchInfo;
    var dt = currentTouchTimeStamp - prevTouchTimeStamp;

    return (dt < DOUBLE_TAP_DELAY && Utils.distance(prevTouchX, prevTouchY, x0, y0) < DOUBLE_TAP_RADIUS);
  }
  saveCurrentWallpaperToCameraRoll() {
    // Make Progress HUD visible
    this.setState({isHudVisible: true});

    var {wallsJSON} = this.state;
    var currentWall = wallsJSON[this.currentWallIndex];
    var currentWallURL = `http://unsplash.it/${currentWall.width}/${currentWall.height}?image=${currentWall.id}`;

    CameraRoll.saveImageWithTag(currentWallURL, (data) => {
      // Hide Progress HUD
      this.setState({isHudVisible: false});

      AlertIOS.alert(
        'Saved',
        'Wallpaper successfully saved to Camera Roll',
        [
          {text: 'High 5!', onPress: () => console.log('OK Pressed!')}
        ]
      );
    },(err) =>{
      console.log('Error saving to camera roll', err);
    });
  }
  renderLoadingMessage() {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicatorIOS
          animating={true}
          color={'#fff'}
          size={'small'}
          style={{margin: 15}} />
        <Text style={{color: '#fff'}}>Contacting Unsplash</Text>
      </View>
    );
  }
  onMomentumScrollEnd(e, state, context) {
    this.currentWallIndex = state.index;
  }
  renderResults() {
    var {wallsJSON, isLoading, isHudVisible} = this.state;
    if(!isLoading) {
      return (
        <View>
          <Swiper dot={<View style={{backgroundColor:'rgba(255,255,255,.4)', width: 8, height: 8,borderRadius: 10, marginLeft: 3, marginRight: 3, marginTop: 3, marginBottom: 3,}} />}

            activeDot={<View style={{backgroundColor: '#fff', width: 13, height: 13, borderRadius: 7, marginLeft: 7, marginRight: 7}} />}
            index={this.currentWallIndex}
            loop={false}

            onMomentumScrollEnd={this.onMomentumScrollEnd}>

            {wallsJSON.map((wallpaper, index) => {
              return(
                <View key={wallpaper.id}>
                  <NetworkImage
                    source={{uri: `https://unsplash.it/${wallpaper.width}/${wallpaper.height}?image=${wallpaper.id}`}}
                    indicator={Progress.Circle}
                    indicatorProps={{
                      color: 'rgba(255, 255, 255)',
                      size: 60,
                      thickness: 7
                    }}
                    threshold={0}
                    style={styles.wallpaperImage}
                    {...this.imagePanResponder.panHandlers}>

                    <Text style={styles.label}>Photo by</Text>
                    <Text style={styles.label_authorName}>{wallpaper.author}</Text>

                  </NetworkImage>

                </View>
              );
            })}
          </Swiper>
          <ProgressHUD width={width} height={height} isVisible={isHudVisible}/>
        </View>
      );
    }
  }
  render() {
    let {isLoading} = this.state;
    if(isLoading) {
      return this.renderLoadingMessage();
    }else{
      return this.renderResults();
    }
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  wallpaperImage: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000'
  },
  label: {
    position: 'absolute',
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    paddingLeft: 5,
    top: 20,
    left: 20,
    width: width/2
  },
  label_authorName: {
    position: 'absolute',
    color: '#fff',
    fontSize: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    paddingLeft: 5,
    top: 41,
    left: 20,
    fontWeight: 'bold',
    width: width/2
  }
});

AppRegistry.registerComponent('LoocaNative', () => LoocaNative);
