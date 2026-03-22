import { productConfig } from '../config/product';
import { srd5eContentPack } from './packs/srd5e';

const contentPackRegistry = {
  [srd5eContentPack.id]: srd5eContentPack,
};

export function getContentPack(contentPackId) {
  return contentPackRegistry[contentPackId] || contentPackRegistry[productConfig.system.contentPackId];
}

export function getActiveContentPack(campaignMeta) {
  return getContentPack(campaignMeta?.contentPackId);
}
