export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export const bridgeHeight=(x:number)=>.2+.8*Math.max(0,1-(x/4.4)**2);
export function storyAt(t:number){
 const approach=smooth(0,6,t),join=smooth(16,23,t);
 const x=-2.9+2.2*approach+1.35*join;
 const walking=t<6||t>16&&t<23;
 const reveal=smooth(4.5,5.4,t)*(1-smooth(9.4,10.8,t));
 return {x,z:2.4,y:bridgeHeight(x),walking,step:walking?Math.sin(t*8.5):0,
  reveal,freeze:smooth(8.4,9,t)*(1-smooth(13,15,t)),
  invite:smooth(12,16,t),join,close:smooth(3.5,6,t)*(1-smooth(10.5,13.5,t)),
  curious:smooth(7,10,t)*(1-smooth(17,21,t))};
}
