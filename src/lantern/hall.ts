import * as T from 'three';
import {archWall,archRim,arch,box,solidRibbon,batch} from './geometry.ts';
import {plaster,lightField} from './materials.ts';
import {paletteMaterial} from './palettes.ts';
import {detailMaterial} from './details.ts';
import {fitHallGeometry} from './mouth-fit.ts';
import {GALLERY_STEP,galleryFloorY} from './choir-grounding.ts';
import {createChoir,type SwanParts,type Singer} from './choir.ts';

/** A monumental water hall, with thick arcades and curved galleries. */
export function createHall(parts:SwanParts){
 const singers:Singer[]=[];
 const root=new T.Group();root.name='Violet light hall';
 const wall=paletteMaterial(plaster('#432654'),'wall'),recess=paletteMaterial(plaster('#2a173f'),'recess'),trim=paletteMaterial(plaster('#795176'),'trim'),floor=paletteMaterial(plaster('#69436e',.66),'floor'),iron=paletteMaterial(detailMaterial('#694867',.065),'iron'),warm=detailMaterial('#ff963f',.28,1.3),fixture=paletteMaterial(detailMaterial('#2a173f',.45),'fixture');
 const railings=new T.Group();railings.name='Continuous rails / pixel coverage';
 const panelGeometry=archWall(5.5,8.3,3.9,7.1,.85),rimGeometry=archRim(3.9,7.1,.13,.22);
 const glowGeometry=new T.ShapeGeometry(arch(3.65,6.9),40);{const p=glowGeometry.attributes.position!,uv=glowGeometry.attributes.uv!;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/3.65+.5,p.getY(i)/6.9);}
 const amber=lightField('#ffbf68','#f37245',1.45),violet=paletteMaterial(lightField('#d992ff','#7538a8',.9),'violetField');
 const pathX=(z:number)=>13.3+1.6*Math.sin((z+5)*.12);
 for(const side of [-1,1]){
  for(let row=0;row<3;row++){
   for(let bay=0;bay<13;bay++){
    const z=32.5-bay*5.4,g=new T.Group();g.position.set(side*pathX(z),row*GALLERY_STEP,z);g.rotation.y=-side*Math.PI/3;root.add(g);g.updateMatrix();singers.push({matrix:g.matrix.clone(),row,bay,side});
    const panel=new T.Mesh(panelGeometry,wall);panel.position.z=-.85;panel.castShadow=true;panel.receiveShadow=true;g.add(panel);
    const rim=new T.Mesh(rimGeometry,trim);rim.position.z=.015;rim.castShadow=true;g.add(rim);
    // Recesses have actual depth, a side return and a luminous back wall.
    box(g,recess,[5.3,8.0,.12],[0,4,-5.65]);
    for(const s of [-1,1])box(g,wall,[.15,8.0,5.8],[s*2.0,4,-2.8]);
    const glow=new T.Mesh(glowGeometry,(bay+row)%4===0?violet:amber);glow.position.set(0,.11,-5.55);g.add(glow);
    box(g,floor,[4.0,.18,6.2],[0,.05,-2.6]);
    const column=new T.Mesh(new T.CylinderGeometry(.25,.34,8.3,12),trim);column.position.set(-2.65,4.15,.1);column.castShadow=true;g.add(column);
    box(g,trim,[.86,.20,1.08],[-2.65,.2,.13]);box(g,trim,[.74,.20,.9],[-2.65,8.15,.13]);
   }
  }
  // Broad continuous balcony plates with full thickness and quiet slender rails.
  for(const y of [0,1,2,3].map(galleryFloorY)){
   const pts=Array.from({length:124},(_,i)=>{const z=34-i*.54;return new T.Vector3(side*(pathX(z)-1.8),y,z);});
   const deck=new T.Mesh(solidRibbon(pts,4.8,.25),floor);deck.receiveShadow=true;root.add(deck);
   const curbPoints=pts.map(v=>new T.Vector3(side*(pathX(v.z)-4.15),y+.025,v.z));
   const curb=new T.Mesh(solidRibbon(curbPoints,.15,.29),wall);curb.castShadow=true;curb.receiveShadow=true;root.add(curb);
   for(let i=0;i<124;i++){
    const z=34-i*.54,x=side*(pathX(z)-4.15);
    if(y>1){const post=box(railings,iron,[.055,.8,.055],[x,y+.4,z]);post.castShadow=false;post.receiveShadow=false;}
   }
   if(y>1){const railPath=new T.CatmullRomCurve3(curbPoints.map(v=>v.clone().setY(y+.81)));const rail=new T.Mesh(new T.TubeGeometry(railPath,123,.037,6,false),iron);railings.add(rail);}
  }
 }
 batch(railings);railings.userData.dynamic=true;root.add(railings);batch(root);
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;const old=o.geometry;o.geometry=fitHallGeometry(old);old.dispose();});
 root.add(createChoir(parts,singers));
 const rear=new T.Mesh(archWall(30,29,11.6,23,1.5),wall);rear.position.set(0,0,-35);root.add(rear);
 // A high back portal anchors the depth, while the next nested world remains visible.

 const rearRim=new T.Mesh(archRim(11.6,23,.24,.35),trim);rearRim.position.set(0,0,-33.38);root.add(rearRim);
 for(let i=0;i<4;i++){const tunnel=new T.Mesh(archRim(11.0-i*.6,22.4-i*.9,.30,.5),i%2?trim:wall);tunnel.position.set(0,0,-40-i*5);root.add(tunnel);}

 // The suspended oculus gives the hall its large, orange light field.
 const rim=new T.Mesh(new T.TorusGeometry(11.8,.55,12,96),trim);rim.rotation.x=Math.PI/2;rim.position.set(0,25.7,-6);rim.scale.y=1.35;root.add(rim);
 const ceilingField=lightField('#ffbd78','#e47d55',1.10);ceilingField.userData.noReflection=true;const ceiling=new T.Mesh(new T.CircleGeometry(11.45,96),ceilingField);ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,25.9,-6);ceiling.scale.y=1.35;root.add(ceiling);
 // Sparse wall sconces at water level establish a second rhythm of warm reflections.
 for(const side of [-1,1])for(let i=0;i<10;i++){
  const z=22-i*5.6,x=side*(pathX(z)-4.5),base=box(railings,fixture,[.45,.18,.50],[x,.8,z]);base.castShadow=false;base.receiveShadow=false;const lamp=new T.Mesh(new T.SphereGeometry(.14,10,8),warm);lamp.position.set(x,1.10,z);railings.add(lamp);
 }
 batch(root);return root;
}
