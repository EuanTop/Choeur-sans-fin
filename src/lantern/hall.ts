import * as T from 'three';
import {archWall,archRim,arch,box,ribbon,batch} from './geometry.ts';
import {plaster,luminous,lightField} from './materials.ts';

/** A monumental water hall, with thick arcades and curved galleries. */
export function createHall(){
 const root=new T.Group();root.name='Violet light hall';
 const wall=plaster('#432654'),recess=plaster('#2a173f'),trim=plaster('#795176'),floor=plaster('#69436e',.66),iron=plaster('#694867'),warm=luminous('#ff963f',1.3);
 const panelGeometry=archWall(5.5,8.3,3.9,7.1,.85),rimGeometry=archRim(3.9,7.1,.13,.22);
 const glowGeometry=new T.ShapeGeometry(arch(3.65,6.9),40);{const p=glowGeometry.attributes.position!,uv=glowGeometry.attributes.uv!;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/3.65+.5,p.getY(i)/6.9);}
 const amber=lightField('#ffbf68','#f37245',1.45),violet=lightField('#d992ff','#7538a8',.9);
 const pathX=(z:number)=>13.3+1.6*Math.sin((z+5)*.12);
 for(const side of [-1,1]){
  for(let row=0;row<3;row++){
   for(let bay=0;bay<13;bay++){
    const z=32.5-bay*5.4,g=new T.Group();g.position.set(side*pathX(z),row*8.4,z);g.rotation.y=-side*Math.PI/3;root.add(g);
    const panel=new T.Mesh(panelGeometry,wall);panel.position.z=-.85;panel.castShadow=true;panel.receiveShadow=true;g.add(panel);
    const rim=new T.Mesh(rimGeometry,trim);rim.position.z=.015;rim.castShadow=true;g.add(rim);
    // Recesses have actual depth, a side return and a luminous back wall.
    box(g,recess,[5.3,8.0,.12],[0,4,-1.45]);
    for(const s of [-1,1])box(g,wall,[.15,8.0,1.6],[s*2.0,4,-1.55]);
    const glow=new T.Mesh(glowGeometry,(bay+row)%4===0?violet:amber);glow.position.set(0,.11,-1.36);g.add(glow);
    box(g,floor,[4.0,.18,3.5],[0,.05,-.65]);
    const column=new T.Mesh(new T.CylinderGeometry(.25,.34,8.3,12),trim);column.position.set(-2.65,4.15,.1);column.castShadow=true;g.add(column);
    box(g,trim,[.86,.20,1.08],[-2.65,.2,.13]);box(g,trim,[.74,.20,.9],[-2.65,8.15,.13]);
   }
  }
  // Broad continuous balcony plates with full thickness and quiet slender rails.
  for(const y of [.65,8.4,16.8,25.2]){
   const pts=Array.from({length:124},(_,i)=>{const z=34-i*.54;return new T.Vector3(side*(pathX(z)-1.8),y,z);});
   const deck=new T.Mesh(ribbon(pts,4.8),floor);deck.receiveShadow=true;root.add(deck);
   const underside=new T.Mesh(ribbon(pts.map(v=>v.clone().add(new T.Vector3(0,-.25,0))),4.8),wall);underside.material.side=T.DoubleSide;root.add(underside);
   for(let i=0;i<124;i++){
    const z=34-i*.54,x=side*(pathX(z)-4.15);box(root,wall,[.15,.29,.59],[x,y-.12,z]);
    if(y>1){box(root,iron,[.055,.8,.055],[x,y+.4,z]);if(i<123){const z2=z-.54,x2=side*(pathX(z2)-4.15),a=new T.Vector3(x,y+.81,z),b=new T.Vector3(x2,y+.81,z2),rail=new T.Mesh(new T.CylinderGeometry(.037,.037,a.distanceTo(b),5),iron);rail.position.copy(a).add(b).multiplyScalar(.5);rail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());root.add(rail);}}
   }
  }
 }
 const rear=new T.Mesh(archWall(30,29,11.6,23,1.5),wall);rear.position.set(0,0,-35);root.add(rear);
 // A high back portal anchors the depth, while the next nested world remains visible.

 const rearRim=new T.Mesh(archRim(11.6,23,.24,.35),trim);rearRim.position.set(0,0,-33.45);root.add(rearRim);
 for(let i=0;i<4;i++){const tunnel=new T.Mesh(archRim(11.0-i*.6,22.4-i*.9,.30,.5),i%2?trim:wall);tunnel.position.set(0,0,-40-i*5);root.add(tunnel);}

 // The suspended oculus gives the hall its large, orange light field.
 const rim=new T.Mesh(new T.TorusGeometry(11.8,.55,12,96),trim);rim.rotation.x=Math.PI/2;rim.position.set(0,25.7,-6);rim.scale.y=1.35;root.add(rim);
 const ceilingField=lightField('#ffbd78','#e47d55',1.10);ceilingField.userData.noReflection=true;const ceiling=new T.Mesh(new T.CircleGeometry(11.45,96),ceilingField);ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,25.9,-6);ceiling.scale.y=1.35;root.add(ceiling);
 // Sparse wall sconces at water level establish a second rhythm of warm reflections.
 for(const side of [-1,1])for(let i=0;i<10;i++){
  const z=22-i*5.6,x=side*(pathX(z)-4.5);box(root,recess,[.45,.18,.50],[x,.8,z]);const lamp=new T.Mesh(new T.SphereGeometry(.14,10,8),warm);lamp.position.set(x,1.10,z);root.add(lamp);
 }
 batch(root);return root;
}
