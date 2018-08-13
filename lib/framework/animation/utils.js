import { utils } from '../../scene-graph';

/**
 * 
 * @param {Entity} entity
 * @return {Skeleton} 
 */
export default function findSkeleton(entity) {
  let result = null;
  utils.walk(entity, (node) => {
    if (result) {
      return;
    }
    let skinningModel = node.getComp("SkinningModel");
    if (skinningModel && skinningModel.skeleton) {
      result = skinningModel.skeleton;
    }
  });
  return result;
}