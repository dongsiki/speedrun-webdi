
document.getElementById('stage-back').addEventListener('click', function () {
  this.disabled = true;
  parent.postMessage({ channel: 'speedrun-midterm-v1', type: 'back' }, '*');
});
