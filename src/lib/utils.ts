/*
##########################################################################################################
Take cardano Policy.Asset and split into two parts
#############################d############################################################################
*/
export const splitAsset = (asset: any) => {
  return asset.split('.')
}
