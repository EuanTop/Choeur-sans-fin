import * as T from 'three';

const CLASSIC={background:'#21102f',wall:'#432654',recess:'#2a173f',trim:'#795176',floor:'#69436e',iron:'#694867',fixture:'#2a173f',glowTop:'#d992ff',glowBottom:'#7538a8',glowGain:.9,waterDepth:1};
const DEEP={background:'#09040f',wall:'#160a21',recess:'#0b0512',trim:'#301637',floor:'#24112f',iron:'#2b1533',fixture:'#100719',glowTop:'#9857bb',glowBottom:'#351344',glowGain:.42,waterDepth:.20};
export type PaletteRole='wall'|'recess'|'trim'|'floor'|'iron'|'fixture'|'violetField';
export function paletteFor(name:string){return name==='Classic violet'?CLASSIC:DEEP;}
export function paletteMaterial<M extends T.Material>(material:M,role:PaletteRole):M{material.userData.paletteRole=role;return material;}
/** Only violet architecture and water change; the pumpkin, birds and amber lamps retain their colours. */
export function applyPalette(scene:T.Scene,name:string){
 const palette=paletteFor(name);if(scene.background instanceof T.Color)scene.background.set(palette.background);if(scene.fog)scene.fog.color.set(palette.background);
 const seen=new Set<T.Material>();
 scene.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
  if(seen.has(material))continue;seen.add(material);const role=material.userData.paletteRole as PaletteRole|undefined;
  if(role==='violetField'&&material instanceof T.ShaderMaterial){material.uniforms.uTop!.value.set(palette.glowTop);material.uniforms.uBottom!.value.set(palette.glowBottom);material.uniforms.uGain!.value=palette.glowGain;}
  else if(role&&role!=='violetField'){const colour=(material as T.Material&{color?:T.Color}).color;if(colour)colour.set(palette[role]);}
 }});
 return palette;
}
