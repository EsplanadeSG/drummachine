var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var DRUM_CLASSES = [
'Kick',
'Snare',
'Hi-hat closed',
'Hi-hat open',
'Tom low',
'Tom mid',
'Tom high',
'Clap',
'Rim'];

var TIME_HUMANIZATION = 0.01;

var sampleBaseUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699';

var reverb = new Tone.Convolver(
sampleBaseUrl + '/small-drum-room.wav').
toMaster();
reverb.wet.value = 0.35;

var snarePanner = new Tone.Panner().connect(reverb);
new Tone.LFO(0.13, -0.25, 0.25).connect(snarePanner.pan).start();

var drumKit = [
new Tone.Players({
  high: sampleBaseUrl + '/808-kick-vh.mp3',
  med: sampleBaseUrl + '/808-kick-vm.mp3',
  low: sampleBaseUrl + '/808-kick-vl.mp3' }).
toMaster(),
new Tone.Players({
  high: sampleBaseUrl + '/flares-snare-vh.mp3',
  med: sampleBaseUrl + '/flares-snare-vm.mp3',
  low: sampleBaseUrl + '/flares-snare-vl.mp3' }).
connect(snarePanner),
new Tone.Players({
  high: sampleBaseUrl + '/808-hihat-vh.mp3',
  med: sampleBaseUrl + '/808-hihat-vm.mp3',
  low: sampleBaseUrl + '/808-hihat-vl.mp3' }).
connect(new Tone.Panner(-0.5).connect(reverb)),
new Tone.Players({
  high: sampleBaseUrl + '/808-hihat-open-vh.mp3',
  med: sampleBaseUrl + '/808-hihat-open-vm.mp3',
  low: sampleBaseUrl + '/808-hihat-open-vl.mp3' }).
connect(new Tone.Panner(-0.5).connect(reverb)),
new Tone.Players({
  high: sampleBaseUrl + '/slamdam-tom-low-vh.mp3',
  med: sampleBaseUrl + '/slamdam-tom-low-vm.mp3',
  low: sampleBaseUrl + '/slamdam-tom-low-vl.mp3' }).
connect(new Tone.Panner(-0.4).connect(reverb)),
new Tone.Players({
  high: sampleBaseUrl + '/slamdam-tom-mid-vh.mp3',
  med: sampleBaseUrl + '/slamdam-tom-mid-vm.mp3',
  low: sampleBaseUrl + '/slamdam-tom-mid-vl.mp3' }).
connect(reverb),
new Tone.Players({
  high: sampleBaseUrl + '/slamdam-tom-high-vh.mp3',
  med: sampleBaseUrl + '/slamdam-tom-high-vm.mp3',
  low: sampleBaseUrl + '/slamdam-tom-high-vl.mp3' }).
connect(new Tone.Panner(0.4).connect(reverb)),
new Tone.Players({
  high: sampleBaseUrl + '/909-clap-vh.mp3',
  med: sampleBaseUrl + '/909-clap-vm.mp3',
  low: sampleBaseUrl + '/909-clap-vl.mp3' }).
connect(new Tone.Panner(0.5).connect(reverb)),
new Tone.Players({
  high: sampleBaseUrl + '/909-rim-vh.wav',
  med: sampleBaseUrl + '/909-rim-vm.wav',
  low: sampleBaseUrl + '/909-rim-vl.wav' }).
connect(new Tone.Panner(0.5).connect(reverb))];

var midiDrums = [36, 38, 42, 46, 41, 43, 45, 49, 51];
var reverseMidiMapping = new Map([
[36, 0],
[35, 0],
[38, 1],
[27, 1],
[28, 1],
[31, 1],
[32, 1],
[33, 1],
[34, 1],
[37, 1],
[39, 1],
[40, 1],
[56, 1],
[65, 1],
[66, 1],
[75, 1],
[85, 1],
[42, 2],
[44, 2],
[54, 2],
[68, 2],
[69, 2],
[70, 2],
[71, 2],
[73, 2],
[78, 2],
[80, 2],
[46, 3],
[67, 3],
[72, 3],
[74, 3],
[79, 3],
[81, 3],
[45, 4],
[29, 4],
[41, 4],
[61, 4],
[64, 4],
[84, 4],
[48, 5],
[47, 5],
[60, 5],
[63, 5],
[77, 5],
[86, 5],
[87, 5],
[50, 6],
[30, 6],
[43, 6],
[62, 6],
[76, 6],
[83, 6],
[49, 7],
[55, 7],
[57, 7],
[58, 7],
[51, 8],
[52, 8],
[53, 8],
[59, 8],
[82, 8]]);


var temperature = 1.0;

var outputs = {
  internal: {
    play: function play(drumIdx, velocity, time) {
      drumKit[drumIdx].get(velocity).start(time);
    } } };



var rnn = new mm.MusicRNN(
'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/drum_kit_rnn');

Promise.all([
rnn.initialize(),
new Promise(function (res) {return Tone.Buffer.on('load', res);})]).
then(function (_ref) {var _ref2 = _slicedToArray(_ref, 1),vars = _ref2[0];
  var state = {
    patternLength: 32,
    seedLength: 4,
    swing: 0.55,
    pattern: [[0], [], [2]].concat(_.times(32, function (i) {return [];})),
    tempo: 120 };

  var stepEls = [],
  hasBeenStarted = false,
  sequence = void 0,
  activeOutput = 'internal';

  function generatePattern(seed, length) {
    var seedSeq = toNoteSequence(seed);
    return rnn.
    continueSequence(seedSeq, length, temperature).
    then(function (r) {return seed.concat(fromNoteSequence(r, length));});
  }

  function getStepVelocity(step) {
    if (step % 4 === 0) {
      return 'high';
    } else if (step % 2 === 0) {
      return 'med';
    } else {
      return 'low';
    }
  }

  function humanizeTime(time) {
    return time - TIME_HUMANIZATION / 2 + Math.random() * TIME_HUMANIZATION;
  }

  function playPattern() {
    sequence = new Tone.Sequence(
    function (time, _ref3) {var drums = _ref3.drums,stepIdx = _ref3.stepIdx;
      var isSwung = stepIdx % 2 !== 0;
      if (isSwung) {
        time += (state.swing - 0.5) * Tone.Time('8n').toSeconds();
      }
      var velocity = getStepVelocity(stepIdx);
      drums.forEach(function (d) {
        var humanizedTime = stepIdx === 0 ? time : humanizeTime(time);
        outputs[activeOutput].play(d, velocity, humanizedTime);
        visualizePlay(humanizedTime, stepIdx, d);
      });
    },
    state.pattern.map(function (drums, stepIdx) {return { drums: drums, stepIdx: stepIdx };}),
    '16n').
    start();
  }

  function visualizePlay(time, stepIdx, drumIdx) {
    Tone.Draw.schedule(function () {
      if (!stepEls[stepIdx]) return;
      var animTime = Tone.Time('2n').toMilliseconds();
      var cellEl = stepEls[stepIdx].cellEls[drumIdx];
      if (cellEl.classList.contains('on')) {
        var baseColor = stepIdx < state.seedLength ? '#e91e63' : '#64b5f6';
        cellEl.animate(
        [
        {
          transform: 'translateZ(-100px)',
          backgroundColor: '#fad1df' },

        {
          transform: 'translateZ(50px)',
          offset: 0.7 },

        { transform: 'translateZ(0)', backgroundColor: baseColor }],

        { duration: animTime, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });

      }
    }, time);
  }

  function renderPattern() {var regenerating = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    var seqEl = document.querySelector('.sequencer .steps');
    while (stepEls.length > state.pattern.length) {var _stepEls$pop =
      stepEls.pop(),stepEl = _stepEls$pop.stepEl,gutterEl = _stepEls$pop.gutterEl;
      stepEl.remove();
      if (gutterEl) gutterEl.remove();
    }var _loop = function _loop(
    stepIdx) {
      var step = state.pattern[stepIdx];
      var stepEl = void 0,gutterEl = void 0,cellEls = void 0;
      if (stepEls[stepIdx]) {
        stepEl = stepEls[stepIdx].stepEl;
        gutterEl = stepEls[stepIdx].gutterEl;
        cellEls = stepEls[stepIdx].cellEls;
      } else {
        stepEl = document.createElement('div');
        stepEl.classList.add('step');
        stepEl.dataset.stepIdx = stepIdx;
        seqEl.appendChild(stepEl);
        cellEls = [];
      }

      stepEl.style.flex = stepIdx % 2 === 0 ? state.swing : 1 - state.swing;

      if (!gutterEl && stepIdx < state.pattern.length - 1) {
        gutterEl = document.createElement('div');
        gutterEl.classList.add('gutter');
        seqEl.insertBefore(gutterEl, stepEl.nextSibling);
      } else if (gutterEl && stepIdx >= state.pattern.length) {
        gutterEl.remove();
        gutterEl = null;
      }

      if (gutterEl && stepIdx === state.seedLength - 1) {
        gutterEl.classList.add('seed-marker');
      } else if (gutterEl) {
        gutterEl.classList.remove('seed-marker');
      }

      for (var cellIdx = 0; cellIdx < DRUM_CLASSES.length; cellIdx++) {
        var cellEl = void 0;
        if (cellEls[cellIdx]) {
          cellEl = cellEls[cellIdx];
        } else {
          cellEl = document.createElement('div');
          cellEl.classList.add('cell');
          cellEl.classList.add(_.kebabCase(DRUM_CLASSES[cellIdx]));
          cellEl.dataset.stepIdx = stepIdx;
          cellEl.dataset.cellIdx = cellIdx;
          stepEl.appendChild(cellEl);
          cellEls[cellIdx] = cellEl;
        }
        if (step.indexOf(cellIdx) >= 0) {
          cellEl.classList.add('on');
        } else {
          cellEl.classList.remove('on');
        }
      }
      stepEls[stepIdx] = { stepEl: stepEl, gutterEl: gutterEl, cellEls: cellEls };

      var stagger = stepIdx * (300 / (state.patternLength - state.seedLength));
      setTimeout(function () {
        if (stepIdx < state.seedLength) {
          stepEl.classList.add('seed');
        } else {
          stepEl.classList.remove('seed');
          if (regenerating) {
            stepEl.classList.add('regenerating');
          } else {
            stepEl.classList.remove('regenerating');
          }
        }
      }, stagger);};for (var stepIdx = 0; stepIdx < state.pattern.length; stepIdx++) {_loop(stepIdx);
    }

    setTimeout(repositionRegenerateButton, 0);
  }

  function repositionRegenerateButton() {
    var regenButton = document.querySelector('.regenerate');
    var sequencerEl = document.querySelector('.sequencer');
    var seedMarkerEl = document.querySelector('.gutter.seed-marker');
    var regenLeft =
    sequencerEl.offsetLeft +
    seedMarkerEl.offsetLeft +
    seedMarkerEl.offsetWidth / 2 -
    regenButton.offsetWidth / 2;
    var regenTop =
    sequencerEl.offsetTop +
    seedMarkerEl.offsetTop +
    seedMarkerEl.offsetHeight / 2 -
    regenButton.offsetHeight / 2;
    regenButton.style.left = regenLeft + 'px';
    regenButton.style.top = regenTop + 'px';
    regenButton.style.visibility = 'visible';
  }

  function regenerate() {
    var seed = _.take(state.pattern, state.seedLength);
    renderPattern(true);
    return generatePattern(seed, state.patternLength - seed.length).then(
    function (result) {
      state.pattern = result;
      onPatternUpdated();
    });

  }

  function onPatternUpdated() {
    if (sequence) {
      sequence.dispose();
      sequence = null;
    }
    renderPattern();
  }

  function toggleStep(cellEl) {
    if (state.pattern && cellEl.classList.contains('cell')) {
      var stepIdx = +cellEl.dataset.stepIdx;
      var cellIdx = +cellEl.dataset.cellIdx;
      var isOn = cellEl.classList.contains('on');
      if (isOn) {
        _.pull(state.pattern[stepIdx], cellIdx);
        cellEl.classList.remove('on');
      } else {
        state.pattern[stepIdx].push(cellIdx);
        cellEl.classList.add('on');
      }
      if (sequence) {
        sequence.at(stepIdx, { stepIdx: stepIdx, drums: state.pattern[stepIdx] });
      }
    }
  }

  function toNoteSequence(pattern) {
    return mm.sequences.quantizeNoteSequence(
    {
      ticksPerQuarter: 220,
      totalTime: pattern.length / 2,
      timeSignatures: [
      {
        time: 0,
        numerator: 4,
        denominator: 4 }],


      tempos: [
      {
        time: 0,
        qpm: 120 }],


      notes: _.flatMap(pattern, function (step, index) {return (
          step.map(function (d) {return {
              pitch: midiDrums[d],
              startTime: index * 0.5,
              endTime: (index + 1) * 0.5 };}));}) },



    1);

  }

  function fromNoteSequence(seq, patternLength) {
    var res = _.times(patternLength, function () {return [];});var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {
      for (var _iterator = seq.notes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var _ref5 = _step.value;var pitch = _ref5.pitch,quantizedStartStep = _ref5.quantizedStartStep;
        res[quantizedStartStep].push(reverseMidiMapping.get(pitch));
      }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator.return) {_iterator.return();}} finally {if (_didIteratorError) {throw _iteratorError;}}}
    return res;
  }

  function setSwing(newSwing) {
    state.swing = newSwing;
    renderPattern();
  }

  function updatePlayPauseIcons() {
    if (Tone.Transport.state === 'started') {
      document.querySelector('.playpause .pause-icon').style.display = null;
      document.querySelector('.playpause .play-icon').style.display = 'none';
    } else {
      document.querySelector('.playpause .play-icon').style.display = null;
      document.querySelector('.playpause .pause-icon').style.display = 'none';
    }
  }

  WebMidi.enable(function (err) {
    if (err) {
      console.error('WebMidi could not be enabled', err);
      return;
    }
    document.querySelector('.webmidi-enabled').style.display = 'block';
    var outputSelector = document.querySelector('.midi-output');

    function onOutputsChange() {
      while (outputSelector.firstChild) {
        outputSelector.firstChild.remove();
      }
      var internalOption = document.createElement('option');
      internalOption.value = 'internal';
      internalOption.innerText = 'Internal drumkit';
      outputSelector.appendChild(internalOption);var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {
        for (var _iterator2 = WebMidi.outputs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var output = _step2.value;
          var option = document.createElement('option');
          option.value = output.id;
          option.innerText = output.name;
          outputSelector.appendChild(option);
        }} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2.return) {_iterator2.return();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}
      onActiveOutputChange('internal');
    }

    function onActiveOutputChange(id) {
      if (activeOutput !== 'internal') {
        outputs[activeOutput] = null;
      }
      activeOutput = id;
      if (activeOutput !== 'internal') {
        var output = WebMidi.getOutputById(id);
        outputs[id] = {
          play: function play(drumIdx, velo, time) {
            var delay = (time - Tone.now()) * 1000;
            var duration = Tone.Time('16n').toMilliseconds();
            var velocity = { high: 1, med: 0.75, low: 0.5 };
            output.playNote(midiDrums[drumIdx], 1, {
              time: delay > 0 ? '+' + delay : WebMidi.now,
              velocity: velocity,
              duration: duration });

          } };

      }var _iteratorNormalCompletion3 = true;var _didIteratorError3 = false;var _iteratorError3 = undefined;try {
        for (var _iterator3 = Array.from(outputSelector.children)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {var option = _step3.value;
          option.selected = option.value === id;
        }} catch (err) {_didIteratorError3 = true;_iteratorError3 = err;} finally {try {if (!_iteratorNormalCompletion3 && _iterator3.return) {_iterator3.return();}} finally {if (_didIteratorError3) {throw _iteratorError3;}}}
    }

    onOutputsChange();
    WebMidi.addListener('connected', onOutputsChange);
    WebMidi.addListener('disconnected', onOutputsChange);
    $(outputSelector).
    on('change', function (evt) {return onActiveOutputChange(evt.target.value);}).
    material_select();
  });

  document.querySelector('.app').addEventListener('click', function (event) {
    if (event.target.classList.contains('cell')) {
      toggleStep(event.target);
    }
  });
  document.querySelector('.regenerate').addEventListener('click', function (event) {
    event.preventDefault();
    event.currentTarget.classList.remove('pulse');
    document.querySelector('.playpause').classList.remove('pulse');
    regenerate().then(function () {
      if (!hasBeenStarted) {
        Tone.context.resume();
        Tone.Transport.start();
        updatePlayPauseIcons();
        hasBeenStarted = true;
      }
      if (Tone.Transport.state === 'started') {
        setTimeout(function () {return playPattern();}, 0);
      }
    });
  });
  document.querySelector('.playpause').addEventListener('click', function (event) {
    event.preventDefault();
    document.querySelector('.playpause').classList.remove('pulse');
    if (Tone.Transport.state !== 'started') {
      Tone.context.resume();
      Tone.Transport.start();
      playPattern();
      updatePlayPauseIcons();
      hasBeenStarted = true;
    } else {
      if (sequence) {
        sequence.dispose();
        sequence = null;
      }
      Tone.Transport.pause();
      updatePlayPauseIcons();
    }
  });

  var draggingSeedMarker = false;
  document.querySelector('.app').addEventListener('mousedown', function (evt) {
    var el = evt.target;
    if (
    el.classList.contains('gutter') &&
    el.classList.contains('seed-marker'))
    {
      draggingSeedMarker = true;
      evt.preventDefault();
    }
  });
  document.querySelector('.app').addEventListener('mouseup', function () {
    draggingSeedMarker = false;
  });
  document.querySelector('.app').addEventListener('mouseover', function (evt) {
    if (draggingSeedMarker) {
      var el = evt.target;
      while (el) {
        if (el.classList.contains('step')) {
          var stepIdx = +el.dataset.stepIdx;
          if (stepIdx > 0) {
            state.seedLength = stepIdx;
            renderPattern();
          }
          break;
        }
        el = el.parentElement;
      }
    }
  });
  document.
  querySelector('#swing').
  addEventListener('input', function (evt) {return setSwing(+evt.target.value);});
  document.
  querySelector('#temperature').
  addEventListener('input', function (evt) {return temperature = +evt.target.value;});
  document.
  querySelector('#tempo').
  addEventListener(
  'input',
  function (evt) {return Tone.Transport.bpm.value = state.tempo = +evt.target.value;});


  $('#pattern-length').
  on('change', function (evt) {return setPatternLength(+evt.target.value);}).
  material_select();

  window.addEventListener('resize', repositionRegenerateButton);

  renderPattern();

  document.querySelector('.progress').remove();
  document.querySelector('.app').style.display = null;
});