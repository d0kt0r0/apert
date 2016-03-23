var ac; // audio context

function baseOnLoad() {
  setupAudioContext();
  setupWebSocket();
}

function setupAudioContext() {
  ac = new (window.AudioContext||window.webkitAudioContext)();
}

function setupWebSocket() {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  var url = 'ws://' + location.hostname + ':8080';
  console.log("attempting websocket connection to " + url);
  ws = new WebSocket(url);
  ws.onopen = function () {
    console.log("extramuros websocket connection opened");
  };
  ws.onerror = function () {
    console.log("ERROR opening extramuros websocket connection");
  };
  ws.onmessage = function (m) {
    var data = JSON.parse(m.data);
    if(data.type == 'osc') {
      console.log("received " + data.address);
      var address = data.address.substring(1);
      if(data.args.length == 0) eval(address + "()");
      else if(data.args.length == 1) eval(address + "(data.args[0])");
      else if(data.args.length == 2) eval(address + "(data.args[0],data.args[1])");
      else if(data.args.length == 3) eval(address + "(data.args[0],data.args[1],data.args[2])");
      else console.log("warning: apert is unfinished software, so sorry, try again later");
      // should probably check to make sure the function exists first!...
    } else {
      console.log("received WebSocket message of unknown type");
    }
  }
}

function testOn() {
  if(ac.test == null) {
    ac.test = {};
    ac.test.sine = ac.createOscillator();
    ac.test.sine.type = 'square';
    ac.test.sine.frequency.value = 440;
    ac.test.sine.start();
    ac.test.filter = ac.createBiquadFilter();
    ac.test.filter.type = 'lowpass';
    ac.test.filter.frequency.value = 1000;
    ac.test.filter.gain.value = 0;
    ac.test.sine.connect(ac.test.filter);
    ac.test.gain = ac.createGain();
    ac.test.filter.connect(ac.test.gain);
    ac.test.gain.connect(ac.destination);
  }
}

function testOff() {
  if(ac.test != null) {
    ac.test.gain.disconnect(ac.destination);
    ac.test = null;
  }
}

function simple(freq,amp) {
	var sine = ac.createOscillator();
	sine.type = 'sine';
	sine.frequency.value = freq;
	var gain = ac.createGain();
	sine.connect(gain);
	gain.connect(ac.destination);
	sine.start();
	// envelope
	var now = ac.currentTime;
	gain.gain.setValueAtTime(0,now);
gain.gain.linearRampToValueAtTime(amp,now+0.005); gain.gain.linearRampToValueAtTime(0,now+0.405);
	// schedule cleanup
	setTimeout(function() {
		sine.stop();
		sine.disconnect(gain);
		gain.disconnect(ac.destination);
	},1000);
};
