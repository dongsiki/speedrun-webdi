
document.getElementById('stage-back').addEventListener('click', function () {
  this.disabled = true;
  ConnectedStage.leave('back');
});
