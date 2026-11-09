/* Maze phase 3 figure studies. No automatic scene insertion or dialogue.
 * Reuses the existing local NPC geometry/atlas and its bind-pose weights.
 * Mesh attribution remains Lucas Pope / 3909, Obra Dinn GDC 2016 demo,
 * as recorded in src/stages/maze/npc-model.js; no new external asset imported.
 */
const MazePhase3Figures = (() => {
  'use strict';
  const POSES = Object.freeze(['listening', 'seated-alone', 'reaching', 'exhausted']);

  function posture(T, data, name) {
    if (!POSES.includes(name)) throw new Error('Unknown maze story posture: ' + name);
    const joint = i => new T.Vector3().setFromMatrixPosition(new T.Matrix4().set(...data.bindPoses[i]).invert());
    const rotate = (x = 0, y = 0, z = 0) => new T.Matrix4().makeRotationFromEuler(new T.Euler(x, y, z, 'XYZ'));
    const around = (point, matrix) => new T.Matrix4().makeTranslation(point.x, point.y, point.z)
      .multiply(matrix).multiply(new T.Matrix4().makeTranslation(-point.x, -point.y, -point.z));
    const bones = Array.from({ length: data.bindPoses.length }, () => new T.Matrix4());
    const assign = (first, last, matrix) => { for (let i = first; i <= last; i++) bones[i] = matrix.clone(); };

    function arm(side, down, forward = 0, fold = 0, cross = 0) {
      const left = side === 'left', shoulder = left ? 9 : 38, elbow = left ? 10 : 39, end = left ? 33 : 62;
      const sign = left ? 1 : -1;
      const upper = around(joint(shoulder), rotate(forward, 0, sign * down));
      bones[shoulder] = upper;
      assign(elbow, end, upper.clone().multiply(around(joint(elbow), rotate(0, sign * fold, sign * cross))));
    }
    function sit() {
      for (const [hip, knee, last] of [[1, 2, 4], [63, 64, 66]]) {
        const thigh = around(joint(hip), rotate(-1.40));
        bones[hip] = thigh;
        assign(knee, last, thigh.clone().multiply(around(joint(knee), rotate(1.40))));
      }
    }
    function bend(spine, head) {
      const torso = around(joint(5), rotate(spine));
      const neck = around(joint(34), rotate(head));
      for (let i = 5; i <= 62; i++) bones[i].premultiply(torso);
      for (let i = 34; i <= 36; i++) bones[i] = torso.clone().multiply(neck);
    }
    if (name === 'listening') {
      arm('left', 1.42, -.12, .15);
      arm('right', 1.18, -.18, .80);
      bend(-.035, -.08);
    } else if (name === 'seated-alone') {
      sit(); arm('left', 1.47, -.26, .70); arm('right', 1.47, -.26, .70);
      bend(.23, .24);
    } else if (name === 'reaching') {
      arm('left', 1.48, .05, .08);
      arm('right', .55, -.55, .32);
      bend(.09, -.035);
    } else {
      sit(); arm('left', 1.14, -.58, .98, -.40); arm('right', 1.14, -.58, .98, -.40);
      bend(.46, .30);
    }
    return { name, bones };
  }

  function create(T, data, bodyTexture, headTexture, makeNPC, name, height = .84) {
    // The neutral standing mesh establishes scale even for seated poses.
    const neutral = makeNPC(T, data, bodyTexture, 'neighbor', headTexture);
    const scale = height / (neutral.bounds.max.y - neutral.bounds.min.y);
    neutral.geometry.dispose();
    for (const material of neutral.mesh.material) material.dispose();
    const npc = makeNPC(T, data, bodyTexture, 'neighbor', headTexture, posture(T, data, name));
    npc.object.name = 'phase3-elder-' + name;
    npc.object.scale.setScalar(scale);
    npc.object.position.y = .003 - npc.bounds.min.y * scale;
    npc.object.userData.storyPose = name;
    npc.object.userData.standingHeight = height;
    // Fix the head in the authored posture; the ordinary NPC tracking loop does
    // not own these figures. Only a small whole-body breath is optional.
    const baselineY = scale;
    return {
      object: npc.object, npc, scale,
      update(seconds, reduced = false) {
        npc.object.scale.y = baselineY * (1 + (reduced ? 0 : Math.sin(seconds * .85) * .0018));
      }
    };
  }
  return { poses: POSES, posture, create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = { MazePhase3Figures };
