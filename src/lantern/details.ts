import * as T from 'three';

const viewportHeight={value:800};
export function setDetailViewport(height:number){viewportHeight.value=height;}

/** Subpixel fixtures fade continuously, instead of blinking as individual samples miss them. */
export function detailMaterial(color:string,thickness:number,emission=0){
 const material=new T.MeshStandardMaterial({color,roughness:1,metalness:0,transparent:true,depthWrite:false,emissive:color,emissiveIntensity:emission});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uDetailViewport=viewportHeight;
  shader.uniforms.uDetailThickness={value:thickness};
  shader.vertexShader='uniform float uDetailViewport,uDetailThickness;varying float vDetailCoverage;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   float modelScale=min(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
   float pixels=uDetailThickness*modelScale*projectionMatrix[1][1]*uDetailViewport/(2.*max(.05,-mvPosition.z));
   vDetailCoverage=smoothstep(.45,1.60,pixels);
  `);
  shader.fragmentShader='varying float vDetailCoverage;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vDetailCoverage;');
 };
 material.customProgramCacheKey=()=> 'subpixel-fixture-v1';
 return material;
}
