var wu=Object.defineProperty;var Ru=(i,e,t)=>e in i?wu(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var he=(i,e,t)=>Ru(i,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();/**
 * @license
 * Copyright 2010-2023 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const go="160",kn={ROTATE:0,DOLLY:1,PAN:2},wi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Cu=0,Wo=1,Pu=2,eh=1,Lu=2,Tn=3,Kn=0,Vt=1,pn=2,Xn=0,er=1,Xo=2,jo=3,Yo=4,Iu=5,hi=100,Du=101,Uu=102,$o=103,qo=104,Fu=200,Nu=201,Ou=202,Bu=203,Ja=204,Qa=205,ku=206,zu=207,Gu=208,Vu=209,Hu=210,Wu=211,Xu=212,ju=213,Yu=214,$u=0,qu=1,Ku=2,bs=3,Zu=4,Ju=5,Qu=6,ed=7,Vs=0,td=1,nd=2,jn=0,id=1,rd=2,sd=3,ad=4,od=5,ld=6,Ko="attached",cd="detached",th=300,ir=301,rr=302,Ms=303,eo=304,Hs=306,Tr=1e3,Yt=1001,to=1002,At=1003,Zo=1004,ta=1005,Qt=1006,hd=1007,wr=1008,Yn=1009,ud=1010,dd=1011,_o=1012,nh=1013,Hn=1014,Pn=1015,Rr=1016,ih=1017,rh=1018,pi=1020,fd=1021,en=1023,pd=1024,md=1025,mi=1026,sr=1027,gd=1028,sh=1029,_d=1030,ah=1031,oh=1033,na=33776,ia=33777,ra=33778,sa=33779,Jo=35840,Qo=35841,el=35842,tl=35843,lh=36196,nl=37492,il=37496,rl=37808,sl=37809,al=37810,ol=37811,ll=37812,cl=37813,hl=37814,ul=37815,dl=37816,fl=37817,pl=37818,ml=37819,gl=37820,_l=37821,aa=36492,xl=36494,vl=36495,xd=36283,yl=36284,Sl=36285,bl=36286,vd=2200,ch=2201,yd=2202,Es=2300,As=2301,oa=2302,Yi=2400,$i=2401,Ts=2402,xo=2500,Sd=2501,hh=3e3,gi=3001,bd=3200,Md=3201,vo=0,Ed=1,tn="",ft="srgb",In="srgb-linear",yo="display-p3",Ws="display-p3-linear",ws="linear",nt="srgb",Rs="rec709",Cs="p3",Ri=7680,Ml=519,Ad=512,Td=513,wd=514,uh=515,Rd=516,Cd=517,Pd=518,Ld=519,El=35044,Ps=35048,Al="300 es",no=1035,Ln=2e3,Ls=2001;class Qn{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const n=this._listeners[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const wt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Tl=1234567;const yr=Math.PI/180,ar=180/Math.PI;function ei(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(wt[i&255]+wt[i>>8&255]+wt[i>>16&255]+wt[i>>24&255]+"-"+wt[e&255]+wt[e>>8&255]+"-"+wt[e>>16&15|64]+wt[e>>24&255]+"-"+wt[t&63|128]+wt[t>>8&255]+"-"+wt[t>>16&255]+wt[t>>24&255]+wt[n&255]+wt[n>>8&255]+wt[n>>16&255]+wt[n>>24&255]).toLowerCase()}function St(i,e,t){return Math.max(e,Math.min(t,i))}function So(i,e){return(i%e+e)%e}function Id(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function Dd(i,e,t){return i!==e?(t-i)/(e-i):0}function Sr(i,e,t){return(1-t)*i+t*e}function Ud(i,e,t,n){return Sr(i,e,1-Math.exp(-t*n))}function Fd(i,e=1){return e-Math.abs(So(i,e*2)-e)}function Nd(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Od(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Bd(i,e){return i+Math.floor(Math.random()*(e-i+1))}function kd(i,e){return i+Math.random()*(e-i)}function zd(i){return i*(.5-Math.random())}function Gd(i){i!==void 0&&(Tl=i);let e=Tl+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Vd(i){return i*yr}function Hd(i){return i*ar}function io(i){return(i&i-1)===0&&i!==0}function Wd(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Is(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Xd(i,e,t,n,r){const s=Math.cos,a=Math.sin,o=s(t/2),l=a(t/2),c=s((e+n)/2),h=a((e+n)/2),u=s((e-n)/2),d=a((e-n)/2),f=s((n-e)/2),g=a((n-e)/2);switch(r){case"XYX":i.set(o*h,l*u,l*d,o*c);break;case"YZY":i.set(l*d,o*h,l*u,o*c);break;case"ZXZ":i.set(l*u,l*d,o*h,o*c);break;case"XZX":i.set(o*h,l*g,l*f,o*c);break;case"YXY":i.set(l*f,o*h,l*g,o*c);break;case"ZYZ":i.set(l*g,l*f,o*h,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function ji(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Ut(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Ct={DEG2RAD:yr,RAD2DEG:ar,generateUUID:ei,clamp:St,euclideanModulo:So,mapLinear:Id,inverseLerp:Dd,lerp:Sr,damp:Ud,pingpong:Fd,smoothstep:Nd,smootherstep:Od,randInt:Bd,randFloat:kd,randFloatSpread:zd,seededRandom:Gd,degToRad:Vd,radToDeg:Hd,isPowerOfTwo:io,ceilPowerOfTwo:Wd,floorPowerOfTwo:Is,setQuaternionFromProperEuler:Xd,normalize:Ut,denormalize:ji};class Le{constructor(e=0,t=0){Le.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(St(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Xe{constructor(e,t,n,r,s,a,o,l,c){Xe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,l,c)}set(e,t,n,r,s,a,o,l,c){const h=this.elements;return h[0]=e,h[1]=r,h[2]=o,h[3]=t,h[4]=s,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],x=r[0],m=r[3],p=r[6],v=r[1],_=r[4],b=r[7],C=r[2],w=r[5],T=r[8];return s[0]=a*x+o*v+l*C,s[3]=a*m+o*_+l*w,s[6]=a*p+o*b+l*T,s[1]=c*x+h*v+u*C,s[4]=c*m+h*_+u*w,s[7]=c*p+h*b+u*T,s[2]=d*x+f*v+g*C,s[5]=d*m+f*_+g*w,s[8]=d*p+f*b+g*T,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-n*s*h+n*o*l+r*s*c-r*a*l}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=h*a-o*c,d=o*l-h*s,f=c*s-a*l,g=t*u+n*d+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return e[0]=u*x,e[1]=(r*c-h*n)*x,e[2]=(o*n-r*a)*x,e[3]=d*x,e[4]=(h*t-r*l)*x,e[5]=(r*s-o*t)*x,e[6]=f*x,e[7]=(n*l-c*t)*x,e[8]=(a*t-n*s)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-r*c,r*l,-r*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(la.makeScale(e,t)),this}rotate(e){return this.premultiply(la.makeRotation(-e)),this}translate(e,t){return this.premultiply(la.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const la=new Xe;function dh(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Cr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function jd(){const i=Cr("canvas");return i.style.display="block",i}const wl={};function br(i){i in wl||(wl[i]=!0,console.warn(i))}const Rl=new Xe().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Cl=new Xe().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Hr={[In]:{transfer:ws,primaries:Rs,toReference:i=>i,fromReference:i=>i},[ft]:{transfer:nt,primaries:Rs,toReference:i=>i.convertSRGBToLinear(),fromReference:i=>i.convertLinearToSRGB()},[Ws]:{transfer:ws,primaries:Cs,toReference:i=>i.applyMatrix3(Cl),fromReference:i=>i.applyMatrix3(Rl)},[yo]:{transfer:nt,primaries:Cs,toReference:i=>i.convertSRGBToLinear().applyMatrix3(Cl),fromReference:i=>i.applyMatrix3(Rl).convertLinearToSRGB()}},Yd=new Set([In,Ws]),et={enabled:!0,_workingColorSpace:In,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(i){if(!Yd.has(i))throw new Error(`Unsupported working color space, "${i}".`);this._workingColorSpace=i},convert:function(i,e,t){if(this.enabled===!1||e===t||!e||!t)return i;const n=Hr[e].toReference,r=Hr[t].fromReference;return r(n(i))},fromWorkingColorSpace:function(i,e){return this.convert(i,this._workingColorSpace,e)},toWorkingColorSpace:function(i,e){return this.convert(i,e,this._workingColorSpace)},getPrimaries:function(i){return Hr[i].primaries},getTransfer:function(i){return i===tn?ws:Hr[i].transfer}};function tr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ca(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ci;class fh{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Ci===void 0&&(Ci=Cr("canvas")),Ci.width=e.width,Ci.height=e.height;const n=Ci.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Ci}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Cr("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=tr(s[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(tr(t[n]/255)*255):t[n]=tr(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let $d=0;class ph{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:$d++}),this.uuid=ei(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(ha(r[a].image)):s.push(ha(r[a]))}else s=ha(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function ha(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?fh.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let qd=0;class Mt extends Qn{constructor(e=Mt.DEFAULT_IMAGE,t=Mt.DEFAULT_MAPPING,n=Yt,r=Yt,s=Qt,a=wr,o=en,l=Yn,c=Mt.DEFAULT_ANISOTROPY,h=tn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:qd++}),this.uuid=ei(),this.name="",this.source=new ph(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Le(0,0),this.repeat=new Le(1,1),this.center=new Le(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(br("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===gi?ft:tn),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==th)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Tr:e.x=e.x-Math.floor(e.x);break;case Yt:e.x=e.x<0?0:1;break;case to:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Tr:e.y=e.y-Math.floor(e.y);break;case Yt:e.y=e.y<0?0:1;break;case to:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return br("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===ft?gi:hh}set encoding(e){br("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=e===gi?ft:tn}}Mt.DEFAULT_IMAGE=null;Mt.DEFAULT_MAPPING=th;Mt.DEFAULT_ANISOTROPY=1;class Qe{constructor(e=0,t=0,n=0,r=1){Qe.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],x=l[2],m=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const _=(c+1)/2,b=(f+1)/2,C=(p+1)/2,w=(h+d)/4,T=(u+x)/4,D=(g+m)/4;return _>b&&_>C?_<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(_),r=w/n,s=T/n):b>C?b<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(b),n=w/r,s=D/r):C<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(C),n=T/s,r=D/s),this.set(n,r,s,t),this}let v=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(v)<.001&&(v=1),this.x=(m-g)/v,this.y=(u-x)/v,this.z=(d-h)/v,this.w=Math.acos((c+f+p-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Kd extends Qn{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Qe(0,0,e,t),this.scissorTest=!1,this.viewport=new Qe(0,0,e,t);const r={width:e,height:t,depth:1};n.encoding!==void 0&&(br("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),n.colorSpace=n.encoding===gi?ft:tn),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Qt,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},n),this.texture=new Mt(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=n.generateMipmaps,this.texture.internalFormat=n.internalFormat,this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}setSize(e,t,n=1){(this.width!==e||this.height!==t||this.depth!==n)&&(this.width=e,this.height=t,this.depth=n,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new ph(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class xi extends Kd{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class mh extends Mt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=At,this.minFilter=At,this.wrapR=Yt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Zd extends Mt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=At,this.minFilter=At,this.wrapR=Yt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class gt{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let l=n[r+0],c=n[r+1],h=n[r+2],u=n[r+3];const d=s[a+0],f=s[a+1],g=s[a+2],x=s[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=x;return}if(u!==x||l!==d||c!==f||h!==g){let m=1-o;const p=l*d+c*f+h*g+u*x,v=p>=0?1:-1,_=1-p*p;if(_>Number.EPSILON){const C=Math.sqrt(_),w=Math.atan2(C,p*v);m=Math.sin(m*w)/C,o=Math.sin(o*w)/C}const b=o*v;if(l=l*m+d*b,c=c*m+f*b,h=h*m+g*b,u=u*m+x*b,m===1-o){const C=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=C,c*=C,h*=C,u*=C}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,s,a){const o=n[r],l=n[r+1],c=n[r+2],h=n[r+3],u=s[a],d=s[a+1],f=s[a+2],g=s[a+3];return e[t]=o*g+h*u+l*f-c*d,e[t+1]=l*g+h*d+c*u-o*f,e[t+2]=c*g+h*f+o*d-l*u,e[t+3]=h*g-o*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(r/2),u=o(s/2),d=l(n/2),f=l(r/2),g=l(s/2);switch(a){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+o+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(a-r)*f}else if(n>o&&n>u){const f=2*Math.sqrt(1+n-o-u);this._w=(h-l)/f,this._x=.25*f,this._y=(r+a)/f,this._z=(s+c)/f}else if(o>u){const f=2*Math.sqrt(1+o-n-u);this._w=(s-c)/f,this._x=(r+a)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-o);this._w=(a-r)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(St(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+a*o+r*c-s*l,this._y=r*h+a*l+s*o-n*c,this._z=s*h+a*c+n*l-r*o,this._w=a*h-n*o-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+n*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*r+t*this._y,this._z=f*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,o),u=Math.sin((1-t)*h)/c,d=Math.sin(t*h)/c;return this._w=a*u+this._w*d,this._x=n*u+this._x*d,this._y=r*u+this._y*d,this._z=s*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=Math.random(),t=Math.sqrt(1-e),n=Math.sqrt(e),r=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(t*Math.cos(r),n*Math.sin(s),n*Math.cos(s),t*Math.sin(r))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(e=0,t=0,n=0){P.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Pl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Pl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*r-o*n),h=2*(o*t-s*r),u=2*(s*n-a*t);return this.x=t+l*c+a*u-o*h,this.y=n+l*h+o*c-s*u,this.z=r+l*u+s*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-s*o,this.y=s*a-n*l,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return ua.copy(this).projectOnVector(e),this.sub(ua)}reflect(e){return this.sub(ua.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(St(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,n=Math.sqrt(1-e**2);return this.x=n*Math.cos(t),this.y=n*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ua=new P,Pl=new gt;class Mi{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(rn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(rn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=rn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,rn):rn.fromBufferAttribute(s,a),rn.applyMatrix4(e.matrixWorld),this.expandByPoint(rn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Wr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Wr.copy(n.boundingBox)),Wr.applyMatrix4(e.matrixWorld),this.union(Wr)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,rn),rn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(pr),Xr.subVectors(this.max,pr),Pi.subVectors(e.a,pr),Li.subVectors(e.b,pr),Ii.subVectors(e.c,pr),Dn.subVectors(Li,Pi),Un.subVectors(Ii,Li),si.subVectors(Pi,Ii);let t=[0,-Dn.z,Dn.y,0,-Un.z,Un.y,0,-si.z,si.y,Dn.z,0,-Dn.x,Un.z,0,-Un.x,si.z,0,-si.x,-Dn.y,Dn.x,0,-Un.y,Un.x,0,-si.y,si.x,0];return!da(t,Pi,Li,Ii,Xr)||(t=[1,0,0,0,1,0,0,0,1],!da(t,Pi,Li,Ii,Xr))?!1:(jr.crossVectors(Dn,Un),t=[jr.x,jr.y,jr.z],da(t,Pi,Li,Ii,Xr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,rn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(rn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(yn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),yn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),yn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),yn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),yn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),yn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),yn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),yn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(yn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const yn=[new P,new P,new P,new P,new P,new P,new P,new P],rn=new P,Wr=new Mi,Pi=new P,Li=new P,Ii=new P,Dn=new P,Un=new P,si=new P,pr=new P,Xr=new P,jr=new P,ai=new P;function da(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){ai.fromArray(i,s);const o=r.x*Math.abs(ai.x)+r.y*Math.abs(ai.y)+r.z*Math.abs(ai.z),l=e.dot(ai),c=t.dot(ai),h=n.dot(ai);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const Jd=new Mi,mr=new P,fa=new P;class cr{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Jd.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;mr.subVectors(e,this.center);const t=mr.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(mr,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(fa.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(mr.copy(e.center).add(fa)),this.expandByPoint(mr.copy(e.center).sub(fa))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Sn=new P,pa=new P,Yr=new P,Fn=new P,ma=new P,$r=new P,ga=new P;class Xs{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Sn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Sn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Sn.copy(this.origin).addScaledVector(this.direction,t),Sn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){pa.copy(e).add(t).multiplyScalar(.5),Yr.copy(t).sub(e).normalize(),Fn.copy(this.origin).sub(pa);const s=e.distanceTo(t)*.5,a=-this.direction.dot(Yr),o=Fn.dot(this.direction),l=-Fn.dot(Yr),c=Fn.lengthSq(),h=Math.abs(1-a*a);let u,d,f,g;if(h>0)if(u=a*l-o,d=a*o-l,g=s*h,u>=0)if(d>=-g)if(d<=g){const x=1/h;u*=x,d*=x,f=u*(u+a*d+2*o)+d*(a*u+d+2*l)+c}else d=s,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d=-s,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-a*s+o)),d=u>0?-s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(u=Math.max(0,-(a*s+o)),d=u>0?s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c);else d=a>0?-s:s,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(pa).addScaledVector(Yr,d),f}intersectSphere(e,t){Sn.subVectors(e.center,this.origin);const n=Sn.dot(this.direction),r=Sn.dot(Sn)-n*n,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),h>=0?(s=(e.min.y-d.y)*h,a=(e.max.y-d.y)*h):(s=(e.max.y-d.y)*h,a=(e.min.y-d.y)*h),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||o>r)||((o>n||n!==n)&&(n=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Sn)!==null}intersectTriangle(e,t,n,r,s){ma.subVectors(t,e),$r.subVectors(n,e),ga.crossVectors(ma,$r);let a=this.direction.dot(ga),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Fn.subVectors(this.origin,e);const l=o*this.direction.dot($r.crossVectors(Fn,$r));if(l<0)return null;const c=o*this.direction.dot(ma.cross(Fn));if(c<0||l+c>a)return null;const h=-o*Fn.dot(ga);return h<0?null:this.at(h/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Te{constructor(e,t,n,r,s,a,o,l,c,h,u,d,f,g,x,m){Te.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,l,c,h,u,d,f,g,x,m)}set(e,t,n,r,s,a,o,l,c,h,u,d,f,g,x,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=g,p[11]=x,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Te().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/Di.setFromMatrixColumn(e,0).length(),s=1/Di.setFromMatrixColumn(e,1).length(),a=1/Di.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(r),c=Math.sin(r),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){const d=a*h,f=a*u,g=o*h,x=o*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+g*c,t[5]=d-x*c,t[9]=-o*l,t[2]=x-d*c,t[6]=g+f*c,t[10]=a*l}else if(e.order==="YXZ"){const d=l*h,f=l*u,g=c*h,x=c*u;t[0]=d+x*o,t[4]=g*o-f,t[8]=a*c,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=f*o-g,t[6]=x+d*o,t[10]=a*l}else if(e.order==="ZXY"){const d=l*h,f=l*u,g=c*h,x=c*u;t[0]=d-x*o,t[4]=-a*u,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*h,t[9]=x-d*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const d=a*h,f=a*u,g=o*h,x=o*u;t[0]=l*h,t[4]=g*c-f,t[8]=d*c+x,t[1]=l*u,t[5]=x*c+d,t[9]=f*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const d=a*l,f=a*c,g=o*l,x=o*c;t[0]=l*h,t[4]=x-d*u,t[8]=g*u+f,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=f*u+g,t[10]=d-x*u}else if(e.order==="XZY"){const d=a*l,f=a*c,g=o*l,x=o*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+x,t[5]=a*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=o*h,t[10]=x*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Qd,e,ef)}lookAt(e,t,n){const r=this.elements;return Xt.subVectors(e,t),Xt.lengthSq()===0&&(Xt.z=1),Xt.normalize(),Nn.crossVectors(n,Xt),Nn.lengthSq()===0&&(Math.abs(n.z)===1?Xt.x+=1e-4:Xt.z+=1e-4,Xt.normalize(),Nn.crossVectors(n,Xt)),Nn.normalize(),qr.crossVectors(Xt,Nn),r[0]=Nn.x,r[4]=qr.x,r[8]=Xt.x,r[1]=Nn.y,r[5]=qr.y,r[9]=Xt.y,r[2]=Nn.z,r[6]=qr.z,r[10]=Xt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],x=n[6],m=n[10],p=n[14],v=n[3],_=n[7],b=n[11],C=n[15],w=r[0],T=r[4],D=r[8],S=r[12],A=r[1],N=r[5],W=r[9],Z=r[13],I=r[2],F=r[6],z=r[10],$=r[14],X=r[3],Y=r[7],q=r[11],J=r[15];return s[0]=a*w+o*A+l*I+c*X,s[4]=a*T+o*N+l*F+c*Y,s[8]=a*D+o*W+l*z+c*q,s[12]=a*S+o*Z+l*$+c*J,s[1]=h*w+u*A+d*I+f*X,s[5]=h*T+u*N+d*F+f*Y,s[9]=h*D+u*W+d*z+f*q,s[13]=h*S+u*Z+d*$+f*J,s[2]=g*w+x*A+m*I+p*X,s[6]=g*T+x*N+m*F+p*Y,s[10]=g*D+x*W+m*z+p*q,s[14]=g*S+x*Z+m*$+p*J,s[3]=v*w+_*A+b*I+C*X,s[7]=v*T+_*N+b*F+C*Y,s[11]=v*D+_*W+b*z+C*q,s[15]=v*S+_*Z+b*$+C*J,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],x=e[7],m=e[11],p=e[15];return g*(+s*l*u-r*c*u-s*o*d+n*c*d+r*o*f-n*l*f)+x*(+t*l*f-t*c*d+s*a*d-r*a*f+r*c*h-s*l*h)+m*(+t*c*u-t*o*f-s*a*u+n*a*f+s*o*h-n*c*h)+p*(-r*o*h-t*l*u+t*o*d+r*a*u-n*a*d+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],x=e[13],m=e[14],p=e[15],v=u*m*c-x*d*c+x*l*f-o*m*f-u*l*p+o*d*p,_=g*d*c-h*m*c-g*l*f+a*m*f+h*l*p-a*d*p,b=h*x*c-g*u*c+g*o*f-a*x*f-h*o*p+a*u*p,C=g*u*l-h*x*l-g*o*d+a*x*d+h*o*m-a*u*m,w=t*v+n*_+r*b+s*C;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const T=1/w;return e[0]=v*T,e[1]=(x*d*s-u*m*s-x*r*f+n*m*f+u*r*p-n*d*p)*T,e[2]=(o*m*s-x*l*s+x*r*c-n*m*c-o*r*p+n*l*p)*T,e[3]=(u*l*s-o*d*s-u*r*c+n*d*c+o*r*f-n*l*f)*T,e[4]=_*T,e[5]=(h*m*s-g*d*s+g*r*f-t*m*f-h*r*p+t*d*p)*T,e[6]=(g*l*s-a*m*s-g*r*c+t*m*c+a*r*p-t*l*p)*T,e[7]=(a*d*s-h*l*s+h*r*c-t*d*c-a*r*f+t*l*f)*T,e[8]=b*T,e[9]=(g*u*s-h*x*s-g*n*f+t*x*f+h*n*p-t*u*p)*T,e[10]=(a*x*s-g*o*s+g*n*c-t*x*c-a*n*p+t*o*p)*T,e[11]=(h*o*s-a*u*s-h*n*c+t*u*c+a*n*f-t*o*f)*T,e[12]=C*T,e[13]=(h*x*r-g*u*r+g*n*d-t*x*d-h*n*m+t*u*m)*T,e[14]=(g*o*r-a*x*r-g*n*l+t*x*l+a*n*m-t*o*m)*T,e[15]=(a*u*r-h*o*r+h*n*l-t*u*l-a*n*d+t*o*d)*T,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,l=e.z,c=s*a,h=s*o;return this.set(c*a+n,c*o-r*l,c*l+r*o,0,c*o+r*l,h*o+n,h*l-r*a,0,c*l-r*o,h*l+r*a,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,h=a+a,u=o+o,d=s*c,f=s*h,g=s*u,x=a*h,m=a*u,p=o*u,v=l*c,_=l*h,b=l*u,C=n.x,w=n.y,T=n.z;return r[0]=(1-(x+p))*C,r[1]=(f+b)*C,r[2]=(g-_)*C,r[3]=0,r[4]=(f-b)*w,r[5]=(1-(d+p))*w,r[6]=(m+v)*w,r[7]=0,r[8]=(g+_)*T,r[9]=(m-v)*T,r[10]=(1-(d+x))*T,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let s=Di.set(r[0],r[1],r[2]).length();const a=Di.set(r[4],r[5],r[6]).length(),o=Di.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],sn.copy(this);const c=1/s,h=1/a,u=1/o;return sn.elements[0]*=c,sn.elements[1]*=c,sn.elements[2]*=c,sn.elements[4]*=h,sn.elements[5]*=h,sn.elements[6]*=h,sn.elements[8]*=u,sn.elements[9]*=u,sn.elements[10]*=u,t.setFromRotationMatrix(sn),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,r,s,a,o=Ln){const l=this.elements,c=2*s/(t-e),h=2*s/(n-r),u=(t+e)/(t-e),d=(n+r)/(n-r);let f,g;if(o===Ln)f=-(a+s)/(a-s),g=-2*a*s/(a-s);else if(o===Ls)f=-a/(a-s),g=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=h,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=Ln){const l=this.elements,c=1/(t-e),h=1/(n-r),u=1/(a-s),d=(t+e)*c,f=(n+r)*h;let g,x;if(o===Ln)g=(a+s)*u,x=-2*u;else if(o===Ls)g=s*u,x=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-d,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-f,l[2]=0,l[6]=0,l[10]=x,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Di=new P,sn=new Te,Qd=new P(0,0,0),ef=new P(1,1,1),Nn=new P,qr=new P,Xt=new P,Ll=new Te,Il=new gt;class Gt{constructor(e=0,t=0,n=0,r=Gt.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],h=r[9],u=r[2],d=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(St(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-St(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(St(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-St(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(St(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-St(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ll.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ll,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Il.setFromEuler(this),this.setFromQuaternion(Il,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Gt.DEFAULT_ORDER="XYZ";class gh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let tf=0;const Dl=new P,Ui=new gt,bn=new Te,Kr=new P,gr=new P,nf=new P,rf=new gt,Ul=new P(1,0,0),Fl=new P(0,1,0),Nl=new P(0,0,1),sf={type:"added"},af={type:"removed"};class rt extends Qn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:tf++}),this.uuid=ei(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=rt.DEFAULT_UP.clone();const e=new P,t=new Gt,n=new gt,r=new P(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Te},normalMatrix:{value:new Xe}}),this.matrix=new Te,this.matrixWorld=new Te,this.matrixAutoUpdate=rt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new gh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ui.setFromAxisAngle(e,t),this.quaternion.multiply(Ui),this}rotateOnWorldAxis(e,t){return Ui.setFromAxisAngle(e,t),this.quaternion.premultiply(Ui),this}rotateX(e){return this.rotateOnAxis(Ul,e)}rotateY(e){return this.rotateOnAxis(Fl,e)}rotateZ(e){return this.rotateOnAxis(Nl,e)}translateOnAxis(e,t){return Dl.copy(e).applyQuaternion(this.quaternion),this.position.add(Dl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Ul,e)}translateY(e){return this.translateOnAxis(Fl,e)}translateZ(e){return this.translateOnAxis(Nl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(bn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Kr.copy(e):Kr.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),gr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?bn.lookAt(gr,Kr,this.up):bn.lookAt(Kr,gr,this.up),this.quaternion.setFromRotationMatrix(bn),r&&(bn.extractRotation(r.matrixWorld),Ui.setFromRotationMatrix(bn),this.quaternion.premultiply(Ui.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(sf)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(af)),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),bn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),bn.multiply(e.parent.matrixWorld)),e.applyMatrix4(bn),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gr,e,nf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gr,rf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++){const s=t[n];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++){const o=r[s];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];s(e.shapes,u)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),u=a(e.shapes),d=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=r,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}rt.DEFAULT_UP=new P(0,1,0);rt.DEFAULT_MATRIX_AUTO_UPDATE=!0;rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const an=new P,Mn=new P,_a=new P,En=new P,Fi=new P,Ni=new P,Ol=new P,xa=new P,va=new P,ya=new P;let Zr=!1;class cn{constructor(e=new P,t=new P,n=new P){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),an.subVectors(e,t),r.cross(an);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){an.subVectors(r,t),Mn.subVectors(n,t),_a.subVectors(e,t);const a=an.dot(an),o=an.dot(Mn),l=an.dot(_a),c=Mn.dot(Mn),h=Mn.dot(_a),u=a*c-o*o;if(u===0)return s.set(0,0,0),null;const d=1/u,f=(c*l-o*h)*d,g=(a*h-o*l)*d;return s.set(1-f-g,g,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,En)===null?!1:En.x>=0&&En.y>=0&&En.x+En.y<=1}static getUV(e,t,n,r,s,a,o,l){return Zr===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Zr=!0),this.getInterpolation(e,t,n,r,s,a,o,l)}static getInterpolation(e,t,n,r,s,a,o,l){return this.getBarycoord(e,t,n,r,En)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,En.x),l.addScaledVector(a,En.y),l.addScaledVector(o,En.z),l)}static isFrontFacing(e,t,n,r){return an.subVectors(n,t),Mn.subVectors(e,t),an.cross(Mn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return an.subVectors(this.c,this.b),Mn.subVectors(this.a,this.b),an.cross(Mn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return cn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return cn.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,n,r,s){return Zr===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Zr=!0),cn.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}getInterpolation(e,t,n,r,s){return cn.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return cn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return cn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let a,o;Fi.subVectors(r,n),Ni.subVectors(s,n),xa.subVectors(e,n);const l=Fi.dot(xa),c=Ni.dot(xa);if(l<=0&&c<=0)return t.copy(n);va.subVectors(e,r);const h=Fi.dot(va),u=Ni.dot(va);if(h>=0&&u<=h)return t.copy(r);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(n).addScaledVector(Fi,a);ya.subVectors(e,s);const f=Fi.dot(ya),g=Ni.dot(ya);if(g>=0&&f<=g)return t.copy(s);const x=f*c-l*g;if(x<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector(Ni,o);const m=h*g-f*u;if(m<=0&&u-h>=0&&f-g>=0)return Ol.subVectors(s,r),o=(u-h)/(u-h+(f-g)),t.copy(r).addScaledVector(Ol,o);const p=1/(m+x+d);return a=x*p,o=d*p,t.copy(n).addScaledVector(Fi,a).addScaledVector(Ni,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const _h={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},On={h:0,s:0,l:0},Jr={h:0,s:0,l:0};function Sa(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ie{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=ft){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,et.toWorkingColorSpace(this,t),this}setRGB(e,t,n,r=et.workingColorSpace){return this.r=e,this.g=t,this.b=n,et.toWorkingColorSpace(this,r),this}setHSL(e,t,n,r=et.workingColorSpace){if(e=So(e,1),t=St(t,0,1),n=St(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Sa(a,s,e+1/3),this.g=Sa(a,s,e),this.b=Sa(a,s,e-1/3)}return et.toWorkingColorSpace(this,r),this}setStyle(e,t=ft){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=ft){const n=_h[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=tr(e.r),this.g=tr(e.g),this.b=tr(e.b),this}copyLinearToSRGB(e){return this.r=ca(e.r),this.g=ca(e.g),this.b=ca(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=ft){return et.fromWorkingColorSpace(Rt.copy(this),e),Math.round(St(Rt.r*255,0,255))*65536+Math.round(St(Rt.g*255,0,255))*256+Math.round(St(Rt.b*255,0,255))}getHexString(e=ft){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=et.workingColorSpace){et.fromWorkingColorSpace(Rt.copy(this),t);const n=Rt.r,r=Rt.g,s=Rt.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const u=a-o;switch(c=h<=.5?u/(a+o):u/(2-a-o),a){case n:l=(r-s)/u+(r<s?6:0);break;case r:l=(s-n)/u+2;break;case s:l=(n-r)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=et.workingColorSpace){return et.fromWorkingColorSpace(Rt.copy(this),t),e.r=Rt.r,e.g=Rt.g,e.b=Rt.b,e}getStyle(e=ft){et.fromWorkingColorSpace(Rt.copy(this),e);const t=Rt.r,n=Rt.g,r=Rt.b;return e!==ft?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(On),this.setHSL(On.h+e,On.s+t,On.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(On),e.getHSL(Jr);const n=Sr(On.h,Jr.h,t),r=Sr(On.s,Jr.s,t),s=Sr(On.l,Jr.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Rt=new Ie;Ie.NAMES=_h;let of=0;class Ei extends Qn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:of++}),this.uuid=ei(),this.name="",this.type="Material",this.blending=er,this.side=Kn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ja,this.blendDst=Qa,this.blendEquation=hi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ie(0,0,0),this.blendAlpha=0,this.depthFunc=bs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ml,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ri,this.stencilZFail=Ri,this.stencilZPass=Ri,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==er&&(n.blending=this.blending),this.side!==Kn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Ja&&(n.blendSrc=this.blendSrc),this.blendDst!==Qa&&(n.blendDst=this.blendDst),this.blendEquation!==hi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==bs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ml&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ri&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Ri&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Ri&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Ai extends Ei{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ie(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Vs,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const mt=new P,Qr=new Le;class Ht{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=El,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=Pn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Qr.fromBufferAttribute(this,t),Qr.applyMatrix3(e),this.setXY(t,Qr.x,Qr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.applyMatrix3(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.applyMatrix4(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.applyNormalMatrix(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.transformDirection(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=ji(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ut(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=ji(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ut(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=ji(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ut(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=ji(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ut(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=ji(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ut(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Ut(t,this.array),n=Ut(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Ut(t,this.array),n=Ut(n,this.array),r=Ut(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=Ut(t,this.array),n=Ut(n,this.array),r=Ut(r,this.array),s=Ut(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==El&&(e.usage=this.usage),e}}class bo extends Ht{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class xh extends Ht{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ct extends Ht{constructor(e,t,n){super(new Float32Array(e),t,n)}}let lf=0;const Kt=new Te,ba=new rt,Oi=new P,jt=new Mi,_r=new Mi,yt=new P;class It extends Qn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:lf++}),this.uuid=ei(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(dh(e)?xh:bo)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Xe().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Kt.makeRotationFromQuaternion(e),this.applyMatrix4(Kt),this}rotateX(e){return Kt.makeRotationX(e),this.applyMatrix4(Kt),this}rotateY(e){return Kt.makeRotationY(e),this.applyMatrix4(Kt),this}rotateZ(e){return Kt.makeRotationZ(e),this.applyMatrix4(Kt),this}translate(e,t,n){return Kt.makeTranslation(e,t,n),this.applyMatrix4(Kt),this}scale(e,t,n){return Kt.makeScale(e,t,n),this.applyMatrix4(Kt),this}lookAt(e){return ba.lookAt(e),ba.updateMatrix(),this.applyMatrix4(ba.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Oi).negate(),this.translate(Oi.x,Oi.y,Oi.z),this}setFromPoints(e){const t=[];for(let n=0,r=e.length;n<r;n++){const s=e[n];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new ct(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Mi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];jt.setFromBufferAttribute(s),this.morphTargetsRelative?(yt.addVectors(this.boundingBox.min,jt.min),this.boundingBox.expandByPoint(yt),yt.addVectors(this.boundingBox.max,jt.max),this.boundingBox.expandByPoint(yt)):(this.boundingBox.expandByPoint(jt.min),this.boundingBox.expandByPoint(jt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new cr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new P,1/0);return}if(e){const n=this.boundingSphere.center;if(jt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];_r.setFromBufferAttribute(o),this.morphTargetsRelative?(yt.addVectors(jt.min,_r.min),jt.expandByPoint(yt),yt.addVectors(jt.max,_r.max),jt.expandByPoint(yt)):(jt.expandByPoint(_r.min),jt.expandByPoint(_r.max))}jt.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)yt.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(yt));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)yt.fromBufferAttribute(o,c),l&&(Oi.fromBufferAttribute(e,c),yt.add(Oi)),r=Math.max(r,n.distanceToSquared(yt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.array,r=t.position.array,s=t.normal.array,a=t.uv.array,o=r.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ht(new Float32Array(4*o),4));const l=this.getAttribute("tangent").array,c=[],h=[];for(let A=0;A<o;A++)c[A]=new P,h[A]=new P;const u=new P,d=new P,f=new P,g=new Le,x=new Le,m=new Le,p=new P,v=new P;function _(A,N,W){u.fromArray(r,A*3),d.fromArray(r,N*3),f.fromArray(r,W*3),g.fromArray(a,A*2),x.fromArray(a,N*2),m.fromArray(a,W*2),d.sub(u),f.sub(u),x.sub(g),m.sub(g);const Z=1/(x.x*m.y-m.x*x.y);isFinite(Z)&&(p.copy(d).multiplyScalar(m.y).addScaledVector(f,-x.y).multiplyScalar(Z),v.copy(f).multiplyScalar(x.x).addScaledVector(d,-m.x).multiplyScalar(Z),c[A].add(p),c[N].add(p),c[W].add(p),h[A].add(v),h[N].add(v),h[W].add(v))}let b=this.groups;b.length===0&&(b=[{start:0,count:n.length}]);for(let A=0,N=b.length;A<N;++A){const W=b[A],Z=W.start,I=W.count;for(let F=Z,z=Z+I;F<z;F+=3)_(n[F+0],n[F+1],n[F+2])}const C=new P,w=new P,T=new P,D=new P;function S(A){T.fromArray(s,A*3),D.copy(T);const N=c[A];C.copy(N),C.sub(T.multiplyScalar(T.dot(N))).normalize(),w.crossVectors(D,N);const Z=w.dot(h[A])<0?-1:1;l[A*4]=C.x,l[A*4+1]=C.y,l[A*4+2]=C.z,l[A*4+3]=Z}for(let A=0,N=b.length;A<N;++A){const W=b[A],Z=W.start,I=W.count;for(let F=Z,z=Z+I;F<z;F+=3)S(n[F+0]),S(n[F+1]),S(n[F+2])}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ht(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const r=new P,s=new P,a=new P,o=new P,l=new P,c=new P,h=new P,u=new P;if(e)for(let d=0,f=e.count;d<f;d+=3){const g=e.getX(d+0),x=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,x),a.fromBufferAttribute(t,m),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)r.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),h.subVectors(a,s),u.subVectors(r,s),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)yt.fromBufferAttribute(e,t),yt.normalize(),e.setXYZ(t,yt.x,yt.y,yt.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,u=o.normalized,d=new c.constructor(l.length*h);let f=0,g=0;for(let x=0,m=l.length;x<m;x++){o.isInterleavedBufferAttribute?f=l[x]*o.data.stride+o.offset:f=l[x]*h;for(let p=0;p<h;p++)d[g++]=c[f++]}return new Ht(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new It,n=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=e(l,n);t.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(r[l]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone(t));const r=e.attributes;for(const c in r){const h=r[c];this.setAttribute(c,h.clone(t))}const s=e.morphAttributes;for(const c in s){const h=[],u=s[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,h=a.length;c<h;c++){const u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Bl=new Te,oi=new Xs,es=new cr,kl=new P,Bi=new P,ki=new P,zi=new P,Ma=new P,ts=new P,ns=new Le,is=new Le,rs=new Le,zl=new P,Gl=new P,Vl=new P,ss=new P,as=new P;class kt extends rt{constructor(e=new It,t=new Ai){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){ts.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const h=o[l],u=s[l];h!==0&&(Ma.fromBufferAttribute(u,e),a?ts.addScaledVector(Ma,h):ts.addScaledVector(Ma.sub(t),h))}t.add(ts)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),es.copy(n.boundingSphere),es.applyMatrix4(s),oi.copy(e.ray).recast(e.near),!(es.containsPoint(oi.origin)===!1&&(oi.intersectSphere(es,kl)===null||oi.origin.distanceToSquared(kl)>(e.far-e.near)**2))&&(Bl.copy(s).invert(),oi.copy(e.ray).applyMatrix4(Bl),!(n.boundingBox!==null&&oi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,oi)))}_computeIntersections(e,t,n){let r;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,d=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,x=d.length;g<x;g++){const m=d[g],p=a[m.materialIndex],v=Math.max(m.start,f.start),_=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let b=v,C=_;b<C;b+=3){const w=o.getX(b),T=o.getX(b+1),D=o.getX(b+2);r=os(this,p,e,n,c,h,u,w,T,D),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),x=Math.min(o.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){const v=o.getX(m),_=o.getX(m+1),b=o.getX(m+2);r=os(this,a,e,n,c,h,u,v,_,b),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,x=d.length;g<x;g++){const m=d[g],p=a[m.materialIndex],v=Math.max(m.start,f.start),_=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let b=v,C=_;b<C;b+=3){const w=b,T=b+1,D=b+2;r=os(this,p,e,n,c,h,u,w,T,D),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){const v=m,_=m+1,b=m+2;r=os(this,a,e,n,c,h,u,v,_,b),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function cf(i,e,t,n,r,s,a,o){let l;if(e.side===Vt?l=n.intersectTriangle(a,s,r,!0,o):l=n.intersectTriangle(r,s,a,e.side===Kn,o),l===null)return null;as.copy(o),as.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(as);return c<t.near||c>t.far?null:{distance:c,point:as.clone(),object:i}}function os(i,e,t,n,r,s,a,o,l,c){i.getVertexPosition(o,Bi),i.getVertexPosition(l,ki),i.getVertexPosition(c,zi);const h=cf(i,e,t,n,Bi,ki,zi,ss);if(h){r&&(ns.fromBufferAttribute(r,o),is.fromBufferAttribute(r,l),rs.fromBufferAttribute(r,c),h.uv=cn.getInterpolation(ss,Bi,ki,zi,ns,is,rs,new Le)),s&&(ns.fromBufferAttribute(s,o),is.fromBufferAttribute(s,l),rs.fromBufferAttribute(s,c),h.uv1=cn.getInterpolation(ss,Bi,ki,zi,ns,is,rs,new Le),h.uv2=h.uv1),a&&(zl.fromBufferAttribute(a,o),Gl.fromBufferAttribute(a,l),Vl.fromBufferAttribute(a,c),h.normal=cn.getInterpolation(ss,Bi,ki,zi,zl,Gl,Vl,new P),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:l,c,normal:new P,materialIndex:0};cn.getNormal(Bi,ki,zi,u.normal),h.face=u}return h}class Ti extends It{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],h=[],u=[];let d=0,f=0;g("z","y","x",-1,-1,n,t,e,a,s,0),g("z","y","x",1,-1,n,t,-e,a,s,1),g("x","z","y",1,1,e,n,t,r,a,2),g("x","z","y",1,-1,e,n,-t,r,a,3),g("x","y","z",1,-1,e,t,n,r,s,4),g("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(l),this.setAttribute("position",new ct(c,3)),this.setAttribute("normal",new ct(h,3)),this.setAttribute("uv",new ct(u,2));function g(x,m,p,v,_,b,C,w,T,D,S){const A=b/T,N=C/D,W=b/2,Z=C/2,I=w/2,F=T+1,z=D+1;let $=0,X=0;const Y=new P;for(let q=0;q<z;q++){const J=q*N-Z;for(let oe=0;oe<F;oe++){const V=oe*A-W;Y[x]=V*v,Y[m]=J*_,Y[p]=I,c.push(Y.x,Y.y,Y.z),Y[x]=0,Y[m]=0,Y[p]=w>0?1:-1,h.push(Y.x,Y.y,Y.z),u.push(oe/T),u.push(1-q/D),$+=1}}for(let q=0;q<D;q++)for(let J=0;J<T;J++){const oe=d+J+F*q,V=d+J+F*(q+1),K=d+(J+1)+F*(q+1),le=d+(J+1)+F*q;l.push(oe,V,le),l.push(V,K,le),X+=6}o.addGroup(f,X,S),f+=X,d+=$}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ti(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function or(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function Ft(i){const e={};for(let t=0;t<i.length;t++){const n=or(i[t]);for(const r in n)e[r]=n[r]}return e}function hf(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function vh(i){return i.getRenderTarget()===null?i.outputColorSpace:et.workingColorSpace}const uf={clone:or,merge:Ft};var df=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ff=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class vi extends Ei{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=df,this.fragmentShader=ff,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=or(e.uniforms),this.uniformsGroups=hf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class yh extends rt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Te,this.projectionMatrix=new Te,this.projectionMatrixInverse=new Te,this.coordinateSystem=Ln}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}class Ot extends yh{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=ar*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(yr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ar*2*Math.atan(Math.tan(yr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(yr*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*r/l,t-=a.offsetY*n/c,r*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Gi=-90,Vi=1;class pf extends rt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Ot(Gi,Vi,e,t);r.layers=this.layers,this.add(r);const s=new Ot(Gi,Vi,e,t);s.layers=this.layers,this.add(s);const a=new Ot(Gi,Vi,e,t);a.layers=this.layers,this.add(a);const o=new Ot(Gi,Vi,e,t);o.layers=this.layers,this.add(o);const l=new Ot(Gi,Vi,e,t);l.layers=this.layers,this.add(l);const c=new Ot(Gi,Vi,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,l]=t;for(const c of t)this.remove(c);if(e===Ln)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Ls)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,s),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,l),e.setRenderTarget(n,4,r),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,r),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class Sh extends Mt{constructor(e,t,n,r,s,a,o,l,c,h){e=e!==void 0?e:[],t=t!==void 0?t:ir,super(e,t,n,r,s,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class mf extends xi{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];t.encoding!==void 0&&(br("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===gi?ft:tn),this.texture=new Sh(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Qt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Ti(5,5,5),s=new vi({name:"CubemapFromEquirect",uniforms:or(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Vt,blending:Xn});s.uniforms.tEquirect.value=t;const a=new kt(r,s),o=t.minFilter;return t.minFilter===wr&&(t.minFilter=Qt),new pf(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,r){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}}const Ea=new P,gf=new P,_f=new Xe;class zn{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=Ea.subVectors(n,t).cross(gf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Ea),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||_f.getNormalMatrix(e),r=this.coplanarPoint(Ea).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const li=new cr,ls=new P;class Mo{constructor(e=new zn,t=new zn,n=new zn,r=new zn,s=new zn,a=new zn){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Ln){const n=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],l=r[3],c=r[4],h=r[5],u=r[6],d=r[7],f=r[8],g=r[9],x=r[10],m=r[11],p=r[12],v=r[13],_=r[14],b=r[15];if(n[0].setComponents(l-s,d-c,m-f,b-p).normalize(),n[1].setComponents(l+s,d+c,m+f,b+p).normalize(),n[2].setComponents(l+a,d+h,m+g,b+v).normalize(),n[3].setComponents(l-a,d-h,m-g,b-v).normalize(),n[4].setComponents(l-o,d-u,m-x,b-_).normalize(),t===Ln)n[5].setComponents(l+o,d+u,m+x,b+_).normalize();else if(t===Ls)n[5].setComponents(o,u,x,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),li.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),li.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(li)}intersectsSprite(e){return li.center.set(0,0,0),li.radius=.7071067811865476,li.applyMatrix4(e.matrixWorld),this.intersectsSphere(li)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(ls.x=r.normal.x>0?e.max.x:e.min.x,ls.y=r.normal.y>0?e.max.y:e.min.y,ls.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(ls)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function bh(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function xf(i,e){const t=e.isWebGL2,n=new WeakMap;function r(c,h){const u=c.array,d=c.usage,f=u.byteLength,g=i.createBuffer();i.bindBuffer(h,g),i.bufferData(h,u,d),c.onUploadCallback();let x;if(u instanceof Float32Array)x=i.FLOAT;else if(u instanceof Uint16Array)if(c.isFloat16BufferAttribute)if(t)x=i.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else x=i.UNSIGNED_SHORT;else if(u instanceof Int16Array)x=i.SHORT;else if(u instanceof Uint32Array)x=i.UNSIGNED_INT;else if(u instanceof Int32Array)x=i.INT;else if(u instanceof Int8Array)x=i.BYTE;else if(u instanceof Uint8Array)x=i.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)x=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:g,type:x,bytesPerElement:u.BYTES_PER_ELEMENT,version:c.version,size:f}}function s(c,h,u){const d=h.array,f=h._updateRange,g=h.updateRanges;if(i.bindBuffer(u,c),f.count===-1&&g.length===0&&i.bufferSubData(u,0,d),g.length!==0){for(let x=0,m=g.length;x<m;x++){const p=g[x];t?i.bufferSubData(u,p.start*d.BYTES_PER_ELEMENT,d,p.start,p.count):i.bufferSubData(u,p.start*d.BYTES_PER_ELEMENT,d.subarray(p.start,p.start+p.count))}h.clearUpdateRanges()}f.count!==-1&&(t?i.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d,f.offset,f.count):i.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d.subarray(f.offset,f.offset+f.count)),f.count=-1),h.onUploadCallback()}function a(c){return c.isInterleavedBufferAttribute&&(c=c.data),n.get(c)}function o(c){c.isInterleavedBufferAttribute&&(c=c.data);const h=n.get(c);h&&(i.deleteBuffer(h.buffer),n.delete(c))}function l(c,h){if(c.isGLBufferAttribute){const d=n.get(c);(!d||d.version<c.version)&&n.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);const u=n.get(c);if(u===void 0)n.set(c,r(c,h));else if(u.version<c.version){if(u.size!==c.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(u.buffer,c,h),u.version=c.version}}return{get:a,remove:o,update:l}}class Eo extends It{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(n),l=Math.floor(r),c=o+1,h=l+1,u=e/o,d=t/l,f=[],g=[],x=[],m=[];for(let p=0;p<h;p++){const v=p*d-a;for(let _=0;_<c;_++){const b=_*u-s;g.push(b,-v,0),x.push(0,0,1),m.push(_/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let v=0;v<o;v++){const _=v+c*p,b=v+c*(p+1),C=v+1+c*(p+1),w=v+1+c*p;f.push(_,b,w),f.push(b,C,w)}this.setIndex(f),this.setAttribute("position",new ct(g,3)),this.setAttribute("normal",new ct(x,3)),this.setAttribute("uv",new ct(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Eo(e.width,e.height,e.widthSegments,e.heightSegments)}}var vf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,yf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Sf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,bf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Mf=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,Ef=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Af=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Tf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,wf=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Rf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,Cf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Pf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Lf=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,If=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Df=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Uf=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,Ff=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Nf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Of=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Bf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,kf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,zf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,Gf=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Vf=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Hf=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Wf=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Xf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,jf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Yf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,$f=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,qf="gl_FragColor = linearToOutputTexel( gl_FragColor );",Kf=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,Zf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Jf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Qf=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,ep=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,tp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,np=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,ip=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,rp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,sp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ap=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,op=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,lp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,cp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,hp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,up=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,dp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,fp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,pp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,mp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,gp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,_p=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,xp=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,vp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,yp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Sp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,bp=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Mp=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ep=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,Ap=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Tp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,wp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Rp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Cp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Lp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ip=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Dp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,Up=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,Fp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,Np=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Op=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Bp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,zp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Gp=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Vp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Hp=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Wp=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Xp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,jp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Yp=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,$p=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,qp=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Kp=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Zp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Jp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Qp=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,em=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,tm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,nm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,im=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,rm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,sm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,am=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,om=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,lm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,cm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,hm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,um=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,dm=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,fm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,pm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,mm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,gm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,_m=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const xm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,vm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ym=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Sm=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Mm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Em=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Am=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Tm=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,wm=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Rm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Cm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Lm=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Im=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Dm=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Um=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Fm=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Nm=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Om=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bm=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,km=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,zm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Gm=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Vm=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Hm=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Wm=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Xm=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jm=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Ym=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,$m=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,qm=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Km=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Zm=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ge={alphahash_fragment:vf,alphahash_pars_fragment:yf,alphamap_fragment:Sf,alphamap_pars_fragment:bf,alphatest_fragment:Mf,alphatest_pars_fragment:Ef,aomap_fragment:Af,aomap_pars_fragment:Tf,batching_pars_vertex:wf,batching_vertex:Rf,begin_vertex:Cf,beginnormal_vertex:Pf,bsdfs:Lf,iridescence_fragment:If,bumpmap_pars_fragment:Df,clipping_planes_fragment:Uf,clipping_planes_pars_fragment:Ff,clipping_planes_pars_vertex:Nf,clipping_planes_vertex:Of,color_fragment:Bf,color_pars_fragment:kf,color_pars_vertex:zf,color_vertex:Gf,common:Vf,cube_uv_reflection_fragment:Hf,defaultnormal_vertex:Wf,displacementmap_pars_vertex:Xf,displacementmap_vertex:jf,emissivemap_fragment:Yf,emissivemap_pars_fragment:$f,colorspace_fragment:qf,colorspace_pars_fragment:Kf,envmap_fragment:Zf,envmap_common_pars_fragment:Jf,envmap_pars_fragment:Qf,envmap_pars_vertex:ep,envmap_physical_pars_fragment:dp,envmap_vertex:tp,fog_vertex:np,fog_pars_vertex:ip,fog_fragment:rp,fog_pars_fragment:sp,gradientmap_pars_fragment:ap,lightmap_fragment:op,lightmap_pars_fragment:lp,lights_lambert_fragment:cp,lights_lambert_pars_fragment:hp,lights_pars_begin:up,lights_toon_fragment:fp,lights_toon_pars_fragment:pp,lights_phong_fragment:mp,lights_phong_pars_fragment:gp,lights_physical_fragment:_p,lights_physical_pars_fragment:xp,lights_fragment_begin:vp,lights_fragment_maps:yp,lights_fragment_end:Sp,logdepthbuf_fragment:bp,logdepthbuf_pars_fragment:Mp,logdepthbuf_pars_vertex:Ep,logdepthbuf_vertex:Ap,map_fragment:Tp,map_pars_fragment:wp,map_particle_fragment:Rp,map_particle_pars_fragment:Cp,metalnessmap_fragment:Pp,metalnessmap_pars_fragment:Lp,morphcolor_vertex:Ip,morphnormal_vertex:Dp,morphtarget_pars_vertex:Up,morphtarget_vertex:Fp,normal_fragment_begin:Np,normal_fragment_maps:Op,normal_pars_fragment:Bp,normal_pars_vertex:kp,normal_vertex:zp,normalmap_pars_fragment:Gp,clearcoat_normal_fragment_begin:Vp,clearcoat_normal_fragment_maps:Hp,clearcoat_pars_fragment:Wp,iridescence_pars_fragment:Xp,opaque_fragment:jp,packing:Yp,premultiplied_alpha_fragment:$p,project_vertex:qp,dithering_fragment:Kp,dithering_pars_fragment:Zp,roughnessmap_fragment:Jp,roughnessmap_pars_fragment:Qp,shadowmap_pars_fragment:em,shadowmap_pars_vertex:tm,shadowmap_vertex:nm,shadowmask_pars_fragment:im,skinbase_vertex:rm,skinning_pars_vertex:sm,skinning_vertex:am,skinnormal_vertex:om,specularmap_fragment:lm,specularmap_pars_fragment:cm,tonemapping_fragment:hm,tonemapping_pars_fragment:um,transmission_fragment:dm,transmission_pars_fragment:fm,uv_pars_fragment:pm,uv_pars_vertex:mm,uv_vertex:gm,worldpos_vertex:_m,background_vert:xm,background_frag:vm,backgroundCube_vert:ym,backgroundCube_frag:Sm,cube_vert:bm,cube_frag:Mm,depth_vert:Em,depth_frag:Am,distanceRGBA_vert:Tm,distanceRGBA_frag:wm,equirect_vert:Rm,equirect_frag:Cm,linedashed_vert:Pm,linedashed_frag:Lm,meshbasic_vert:Im,meshbasic_frag:Dm,meshlambert_vert:Um,meshlambert_frag:Fm,meshmatcap_vert:Nm,meshmatcap_frag:Om,meshnormal_vert:Bm,meshnormal_frag:km,meshphong_vert:zm,meshphong_frag:Gm,meshphysical_vert:Vm,meshphysical_frag:Hm,meshtoon_vert:Wm,meshtoon_frag:Xm,points_vert:jm,points_frag:Ym,shadow_vert:$m,shadow_frag:qm,sprite_vert:Km,sprite_frag:Zm},ae={common:{diffuse:{value:new Ie(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xe}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xe},normalScale:{value:new Le(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ie(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ie(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0},uvTransform:{value:new Xe}},sprite:{diffuse:{value:new Ie(16777215)},opacity:{value:1},center:{value:new Le(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}}},un={basic:{uniforms:Ft([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.fog]),vertexShader:Ge.meshbasic_vert,fragmentShader:Ge.meshbasic_frag},lambert:{uniforms:Ft([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,ae.lights,{emissive:{value:new Ie(0)}}]),vertexShader:Ge.meshlambert_vert,fragmentShader:Ge.meshlambert_frag},phong:{uniforms:Ft([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,ae.lights,{emissive:{value:new Ie(0)},specular:{value:new Ie(1118481)},shininess:{value:30}}]),vertexShader:Ge.meshphong_vert,fragmentShader:Ge.meshphong_frag},standard:{uniforms:Ft([ae.common,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.roughnessmap,ae.metalnessmap,ae.fog,ae.lights,{emissive:{value:new Ie(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag},toon:{uniforms:Ft([ae.common,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.gradientmap,ae.fog,ae.lights,{emissive:{value:new Ie(0)}}]),vertexShader:Ge.meshtoon_vert,fragmentShader:Ge.meshtoon_frag},matcap:{uniforms:Ft([ae.common,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,{matcap:{value:null}}]),vertexShader:Ge.meshmatcap_vert,fragmentShader:Ge.meshmatcap_frag},points:{uniforms:Ft([ae.points,ae.fog]),vertexShader:Ge.points_vert,fragmentShader:Ge.points_frag},dashed:{uniforms:Ft([ae.common,ae.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ge.linedashed_vert,fragmentShader:Ge.linedashed_frag},depth:{uniforms:Ft([ae.common,ae.displacementmap]),vertexShader:Ge.depth_vert,fragmentShader:Ge.depth_frag},normal:{uniforms:Ft([ae.common,ae.bumpmap,ae.normalmap,ae.displacementmap,{opacity:{value:1}}]),vertexShader:Ge.meshnormal_vert,fragmentShader:Ge.meshnormal_frag},sprite:{uniforms:Ft([ae.sprite,ae.fog]),vertexShader:Ge.sprite_vert,fragmentShader:Ge.sprite_frag},background:{uniforms:{uvTransform:{value:new Xe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ge.background_vert,fragmentShader:Ge.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Ge.backgroundCube_vert,fragmentShader:Ge.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ge.cube_vert,fragmentShader:Ge.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ge.equirect_vert,fragmentShader:Ge.equirect_frag},distanceRGBA:{uniforms:Ft([ae.common,ae.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ge.distanceRGBA_vert,fragmentShader:Ge.distanceRGBA_frag},shadow:{uniforms:Ft([ae.lights,ae.fog,{color:{value:new Ie(0)},opacity:{value:1}}]),vertexShader:Ge.shadow_vert,fragmentShader:Ge.shadow_frag}};un.physical={uniforms:Ft([un.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xe},clearcoatNormalScale:{value:new Le(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xe},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xe},sheen:{value:0},sheenColor:{value:new Ie(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xe},transmissionSamplerSize:{value:new Le},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xe},attenuationDistance:{value:0},attenuationColor:{value:new Ie(0)},specularColor:{value:new Ie(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xe},anisotropyVector:{value:new Le},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xe}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag};const cs={r:0,b:0,g:0};function Jm(i,e,t,n,r,s,a){const o=new Ie(0);let l=s===!0?0:1,c,h,u=null,d=0,f=null;function g(m,p){let v=!1,_=p.isScene===!0?p.background:null;_&&_.isTexture&&(_=(p.backgroundBlurriness>0?t:e).get(_)),_===null?x(o,l):_&&_.isColor&&(x(_,1),v=!0);const b=i.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,a):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||v)&&i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil),_&&(_.isCubeTexture||_.mapping===Hs)?(h===void 0&&(h=new kt(new Ti(1,1,1),new vi({name:"BackgroundCubeMaterial",uniforms:or(un.backgroundCube.uniforms),vertexShader:un.backgroundCube.vertexShader,fragmentShader:un.backgroundCube.fragmentShader,side:Vt,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(C,w,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),h.material.uniforms.envMap.value=_,h.material.uniforms.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=p.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=p.backgroundIntensity,h.material.toneMapped=et.getTransfer(_.colorSpace)!==nt,(u!==_||d!==_.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,u=_,d=_.version,f=i.toneMapping),h.layers.enableAll(),m.unshift(h,h.geometry,h.material,0,0,null)):_&&_.isTexture&&(c===void 0&&(c=new kt(new Eo(2,2),new vi({name:"BackgroundMaterial",uniforms:or(un.background.uniforms),vertexShader:un.background.vertexShader,fragmentShader:un.background.fragmentShader,side:Kn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=_,c.material.uniforms.backgroundIntensity.value=p.backgroundIntensity,c.material.toneMapped=et.getTransfer(_.colorSpace)!==nt,_.matrixAutoUpdate===!0&&_.updateMatrix(),c.material.uniforms.uvTransform.value.copy(_.matrix),(u!==_||d!==_.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,u=_,d=_.version,f=i.toneMapping),c.layers.enableAll(),m.unshift(c,c.geometry,c.material,0,0,null))}function x(m,p){m.getRGB(cs,vh(i)),n.buffers.color.setClear(cs.r,cs.g,cs.b,p,a)}return{getClearColor:function(){return o},setClearColor:function(m,p=1){o.set(m),l=p,x(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(m){l=m,x(o,l)},render:g}}function Qm(i,e,t,n){const r=i.getParameter(i.MAX_VERTEX_ATTRIBS),s=n.isWebGL2?null:e.get("OES_vertex_array_object"),a=n.isWebGL2||s!==null,o={},l=m(null);let c=l,h=!1;function u(I,F,z,$,X){let Y=!1;if(a){const q=x($,z,F);c!==q&&(c=q,f(c.object)),Y=p(I,$,z,X),Y&&v(I,$,z,X)}else{const q=F.wireframe===!0;(c.geometry!==$.id||c.program!==z.id||c.wireframe!==q)&&(c.geometry=$.id,c.program=z.id,c.wireframe=q,Y=!0)}X!==null&&t.update(X,i.ELEMENT_ARRAY_BUFFER),(Y||h)&&(h=!1,D(I,F,z,$),X!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(X).buffer))}function d(){return n.isWebGL2?i.createVertexArray():s.createVertexArrayOES()}function f(I){return n.isWebGL2?i.bindVertexArray(I):s.bindVertexArrayOES(I)}function g(I){return n.isWebGL2?i.deleteVertexArray(I):s.deleteVertexArrayOES(I)}function x(I,F,z){const $=z.wireframe===!0;let X=o[I.id];X===void 0&&(X={},o[I.id]=X);let Y=X[F.id];Y===void 0&&(Y={},X[F.id]=Y);let q=Y[$];return q===void 0&&(q=m(d()),Y[$]=q),q}function m(I){const F=[],z=[],$=[];for(let X=0;X<r;X++)F[X]=0,z[X]=0,$[X]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:z,attributeDivisors:$,object:I,attributes:{},index:null}}function p(I,F,z,$){const X=c.attributes,Y=F.attributes;let q=0;const J=z.getAttributes();for(const oe in J)if(J[oe].location>=0){const K=X[oe];let le=Y[oe];if(le===void 0&&(oe==="instanceMatrix"&&I.instanceMatrix&&(le=I.instanceMatrix),oe==="instanceColor"&&I.instanceColor&&(le=I.instanceColor)),K===void 0||K.attribute!==le||le&&K.data!==le.data)return!0;q++}return c.attributesNum!==q||c.index!==$}function v(I,F,z,$){const X={},Y=F.attributes;let q=0;const J=z.getAttributes();for(const oe in J)if(J[oe].location>=0){let K=Y[oe];K===void 0&&(oe==="instanceMatrix"&&I.instanceMatrix&&(K=I.instanceMatrix),oe==="instanceColor"&&I.instanceColor&&(K=I.instanceColor));const le={};le.attribute=K,K&&K.data&&(le.data=K.data),X[oe]=le,q++}c.attributes=X,c.attributesNum=q,c.index=$}function _(){const I=c.newAttributes;for(let F=0,z=I.length;F<z;F++)I[F]=0}function b(I){C(I,0)}function C(I,F){const z=c.newAttributes,$=c.enabledAttributes,X=c.attributeDivisors;z[I]=1,$[I]===0&&(i.enableVertexAttribArray(I),$[I]=1),X[I]!==F&&((n.isWebGL2?i:e.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](I,F),X[I]=F)}function w(){const I=c.newAttributes,F=c.enabledAttributes;for(let z=0,$=F.length;z<$;z++)F[z]!==I[z]&&(i.disableVertexAttribArray(z),F[z]=0)}function T(I,F,z,$,X,Y,q){q===!0?i.vertexAttribIPointer(I,F,z,X,Y):i.vertexAttribPointer(I,F,z,$,X,Y)}function D(I,F,z,$){if(n.isWebGL2===!1&&(I.isInstancedMesh||$.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;_();const X=$.attributes,Y=z.getAttributes(),q=F.defaultAttributeValues;for(const J in Y){const oe=Y[J];if(oe.location>=0){let V=X[J];if(V===void 0&&(J==="instanceMatrix"&&I.instanceMatrix&&(V=I.instanceMatrix),J==="instanceColor"&&I.instanceColor&&(V=I.instanceColor)),V!==void 0){const K=V.normalized,le=V.itemSize,_e=t.get(V);if(_e===void 0)continue;const ce=_e.buffer,Me=_e.type,De=_e.bytesPerElement,we=n.isWebGL2===!0&&(Me===i.INT||Me===i.UNSIGNED_INT||V.gpuType===nh);if(V.isInterleavedBufferAttribute){const Ye=V.data,B=Ye.stride,Et=V.offset;if(Ye.isInstancedInterleavedBuffer){for(let Ee=0;Ee<oe.locationSize;Ee++)C(oe.location+Ee,Ye.meshPerAttribute);I.isInstancedMesh!==!0&&$._maxInstanceCount===void 0&&($._maxInstanceCount=Ye.meshPerAttribute*Ye.count)}else for(let Ee=0;Ee<oe.locationSize;Ee++)b(oe.location+Ee);i.bindBuffer(i.ARRAY_BUFFER,ce);for(let Ee=0;Ee<oe.locationSize;Ee++)T(oe.location+Ee,le/oe.locationSize,Me,K,B*De,(Et+le/oe.locationSize*Ee)*De,we)}else{if(V.isInstancedBufferAttribute){for(let Ye=0;Ye<oe.locationSize;Ye++)C(oe.location+Ye,V.meshPerAttribute);I.isInstancedMesh!==!0&&$._maxInstanceCount===void 0&&($._maxInstanceCount=V.meshPerAttribute*V.count)}else for(let Ye=0;Ye<oe.locationSize;Ye++)b(oe.location+Ye);i.bindBuffer(i.ARRAY_BUFFER,ce);for(let Ye=0;Ye<oe.locationSize;Ye++)T(oe.location+Ye,le/oe.locationSize,Me,K,le*De,le/oe.locationSize*Ye*De,we)}}else if(q!==void 0){const K=q[J];if(K!==void 0)switch(K.length){case 2:i.vertexAttrib2fv(oe.location,K);break;case 3:i.vertexAttrib3fv(oe.location,K);break;case 4:i.vertexAttrib4fv(oe.location,K);break;default:i.vertexAttrib1fv(oe.location,K)}}}}w()}function S(){W();for(const I in o){const F=o[I];for(const z in F){const $=F[z];for(const X in $)g($[X].object),delete $[X];delete F[z]}delete o[I]}}function A(I){if(o[I.id]===void 0)return;const F=o[I.id];for(const z in F){const $=F[z];for(const X in $)g($[X].object),delete $[X];delete F[z]}delete o[I.id]}function N(I){for(const F in o){const z=o[F];if(z[I.id]===void 0)continue;const $=z[I.id];for(const X in $)g($[X].object),delete $[X];delete z[I.id]}}function W(){Z(),h=!0,c!==l&&(c=l,f(c.object))}function Z(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:u,reset:W,resetDefaultState:Z,dispose:S,releaseStatesOfGeometry:A,releaseStatesOfProgram:N,initAttributes:_,enableAttribute:b,disableUnusedAttributes:w}}function eg(i,e,t,n){const r=n.isWebGL2;let s;function a(h){s=h}function o(h,u){i.drawArrays(s,h,u),t.update(u,s,1)}function l(h,u,d){if(d===0)return;let f,g;if(r)f=i,g="drawArraysInstanced";else if(f=e.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",f===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}f[g](s,h,u,d),t.update(u,s,d)}function c(h,u,d){if(d===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<d;g++)this.render(h[g],u[g]);else{f.multiDrawArraysWEBGL(s,h,0,u,0,d);let g=0;for(let x=0;x<d;x++)g+=u[x];t.update(g,s,1)}}this.setMode=a,this.render=o,this.renderInstances=l,this.renderMultiDraw=c}function tg(i,e,t){let n;function r(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){const T=e.get("EXT_texture_filter_anisotropic");n=i.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function s(T){if(T==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}const a=typeof WebGL2RenderingContext<"u"&&i.constructor.name==="WebGL2RenderingContext";let o=t.precision!==void 0?t.precision:"highp";const l=s(o);l!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",l,"instead."),o=l);const c=a||e.has("WEBGL_draw_buffers"),h=t.logarithmicDepthBuffer===!0,u=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),d=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),f=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),x=i.getParameter(i.MAX_VERTEX_ATTRIBS),m=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),p=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),_=d>0,b=a||e.has("OES_texture_float"),C=_&&b,w=a?i.getParameter(i.MAX_SAMPLES):0;return{isWebGL2:a,drawBuffers:c,getMaxAnisotropy:r,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:h,maxTextures:u,maxVertexTextures:d,maxTextureSize:f,maxCubemapSize:g,maxAttributes:x,maxVertexUniforms:m,maxVaryings:p,maxFragmentUniforms:v,vertexTextures:_,floatFragmentTextures:b,floatVertexTextures:C,maxSamples:w}}function ng(i){const e=this;let t=null,n=0,r=!1,s=!1;const a=new zn,o=new Xe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||r;return r=d,n=u.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){const g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,p=i.get(u);if(!r||g===null||g.length===0||s&&!m)s?h(null):c();else{const v=s?0:n,_=v*4;let b=p.clippingState||null;l.value=b,b=h(g,d,_,f);for(let C=0;C!==_;++C)b[C]=t[C];p.clippingState=b,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,g){const x=u!==null?u.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const p=f+x*4,v=d.matrixWorldInverse;o.getNormalMatrix(v),(m===null||m.length<p)&&(m=new Float32Array(p));for(let _=0,b=f;_!==x;++_,b+=4)a.copy(u[_]).applyMatrix4(v,o),a.normal.toArray(m,b),m[b+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function ig(i){let e=new WeakMap;function t(a,o){return o===Ms?a.mapping=ir:o===eo&&(a.mapping=rr),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===Ms||o===eo)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new mf(l.height/2);return c.fromEquirectangularTexture(i,a),e.set(a,c),a.addEventListener("dispose",r),t(c.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}class Ao extends yh{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const qi=4,Hl=[.125,.215,.35,.446,.526,.582],ui=20,Aa=new Ao,Wl=new Ie;let Ta=null,wa=0,Ra=0;const ci=(1+Math.sqrt(5))/2,Hi=1/ci,Xl=[new P(1,1,1),new P(-1,1,1),new P(1,1,-1),new P(-1,1,-1),new P(0,ci,Hi),new P(0,ci,-Hi),new P(Hi,0,ci),new P(-Hi,0,ci),new P(ci,Hi,0),new P(-ci,Hi,0)];class jl{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100){Ta=this._renderer.getRenderTarget(),wa=this._renderer.getActiveCubeFace(),Ra=this._renderer.getActiveMipmapLevel(),this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ql(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=$l(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Ta,wa,Ra),e.scissorTest=!1,hs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ir||e.mapping===rr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Ta=this._renderer.getRenderTarget(),wa=this._renderer.getActiveCubeFace(),Ra=this._renderer.getActiveMipmapLevel();const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Qt,minFilter:Qt,generateMipmaps:!1,type:Rr,format:en,colorSpace:In,depthBuffer:!1},r=Yl(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Yl(e,t,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=rg(s)),this._blurMaterial=sg(s,e,t)}return r}_compileMaterial(e){const t=new kt(this._lodPlanes[0],e);this._renderer.compile(t,Aa)}_sceneToCubeUV(e,t,n,r){const o=new Ot(90,1,t,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(Wl),h.toneMapping=jn,h.autoClear=!1;const f=new Ai({name:"PMREM.Background",side:Vt,depthWrite:!1,depthTest:!1}),g=new kt(new Ti,f);let x=!1;const m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,x=!0):(f.color.copy(Wl),x=!0);for(let p=0;p<6;p++){const v=p%3;v===0?(o.up.set(0,l[p],0),o.lookAt(c[p],0,0)):v===1?(o.up.set(0,0,l[p]),o.lookAt(0,c[p],0)):(o.up.set(0,l[p],0),o.lookAt(0,0,c[p]));const _=this._cubeSize;hs(r,v*_,p>2?_:0,_,_),h.setRenderTarget(r),x&&h.render(g,o),h.render(e,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,e.background=m}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===ir||e.mapping===rr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=ql()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=$l());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new kt(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const l=this._cubeSize;hs(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,Aa)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;for(let r=1;r<this._lodPlanes.length;r++){const s=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=Xl[(r-1)%Xl.length];this._blur(e,r-1,r,s,a)}t.autoClear=n}_blur(e,t,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new kt(this._lodPlanes[r],c),d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ui-1),x=s/g,m=isFinite(s)?1+Math.floor(h*x):ui;m>ui&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${ui}`);const p=[];let v=0;for(let T=0;T<ui;++T){const D=T/x,S=Math.exp(-D*D/2);p.push(S),T===0?v+=S:T<m&&(v+=2*S)}for(let T=0;T<p.length;T++)p[T]=p[T]/v;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);const{_lodMax:_}=this;d.dTheta.value=g,d.mipInt.value=_-n;const b=this._sizeLods[r],C=3*b*(r>_-qi?r-_+qi:0),w=4*(this._cubeSize-b);hs(t,C,w,3*b,2*b),l.setRenderTarget(t),l.render(u,Aa)}}function rg(i){const e=[],t=[],n=[];let r=i;const s=i-qi+1+Hl.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let l=1/o;a>i-qi?l=Hl[a-i+qi-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,x=3,m=2,p=1,v=new Float32Array(x*g*f),_=new Float32Array(m*g*f),b=new Float32Array(p*g*f);for(let w=0;w<f;w++){const T=w%3*2/3-1,D=w>2?0:-1,S=[T,D,0,T+2/3,D,0,T+2/3,D+1,0,T,D,0,T+2/3,D+1,0,T,D+1,0];v.set(S,x*g*w),_.set(d,m*g*w);const A=[w,w,w,w,w,w];b.set(A,p*g*w)}const C=new It;C.setAttribute("position",new Ht(v,x)),C.setAttribute("uv",new Ht(_,m)),C.setAttribute("faceIndex",new Ht(b,p)),e.push(C),r>qi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Yl(i,e,t){const n=new xi(i,e,t);return n.texture.mapping=Hs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function hs(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function sg(i,e,t){const n=new Float32Array(ui),r=new P(0,1,0);return new vi({name:"SphericalGaussianBlur",defines:{n:ui,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:To(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function $l(){return new vi({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:To(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function ql(){return new vi({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:To(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function To(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function ag(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===Ms||l===eo,h=l===ir||l===rr;if(c||h)if(o.isRenderTargetTexture&&o.needsPMREMUpdate===!0){o.needsPMREMUpdate=!1;let u=e.get(o);return t===null&&(t=new jl(i)),u=c?t.fromEquirectangular(o,u):t.fromCubemap(o,u),e.set(o,u),u.texture}else{if(e.has(o))return e.get(o).texture;{const u=o.image;if(c&&u&&u.height>0||h&&u&&r(u)){t===null&&(t=new jl(i));const d=c?t.fromEquirectangular(o):t.fromCubemap(o);return e.set(o,d),o.addEventListener("dispose",s),d.texture}else return null}}}return o}function r(o){let l=0;const c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function s(o){const l=o.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function og(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(n){n.isWebGL2?(t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance")):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(n){const r=t(n);return r===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function lg(i,e,t,n){const r={},s=new WeakMap;function a(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);for(const g in d.morphAttributes){const x=d.morphAttributes[g];for(let m=0,p=x.length;m<p;m++)e.remove(x[m])}d.removeEventListener("dispose",a),delete r[d.id];const f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(u,d){return r[d.id]===!0||(d.addEventListener("dispose",a),r[d.id]=!0,t.memory.geometries++),d}function l(u){const d=u.attributes;for(const g in d)e.update(d[g],i.ARRAY_BUFFER);const f=u.morphAttributes;for(const g in f){const x=f[g];for(let m=0,p=x.length;m<p;m++)e.update(x[m],i.ARRAY_BUFFER)}}function c(u){const d=[],f=u.index,g=u.attributes.position;let x=0;if(f!==null){const v=f.array;x=f.version;for(let _=0,b=v.length;_<b;_+=3){const C=v[_+0],w=v[_+1],T=v[_+2];d.push(C,w,w,T,T,C)}}else if(g!==void 0){const v=g.array;x=g.version;for(let _=0,b=v.length/3-1;_<b;_+=3){const C=_+0,w=_+1,T=_+2;d.push(C,w,w,T,T,C)}}else return;const m=new(dh(d)?xh:bo)(d,1);m.version=x;const p=s.get(u);p&&e.remove(p),s.set(u,m)}function h(u){const d=s.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return s.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function cg(i,e,t,n){const r=n.isWebGL2;let s;function a(f){s=f}let o,l;function c(f){o=f.type,l=f.bytesPerElement}function h(f,g){i.drawElements(s,g,o,f*l),t.update(g,s,1)}function u(f,g,x){if(x===0)return;let m,p;if(r)m=i,p="drawElementsInstanced";else if(m=e.get("ANGLE_instanced_arrays"),p="drawElementsInstancedANGLE",m===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[p](s,g,o,f*l,x),t.update(g,s,x)}function d(f,g,x){if(x===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<x;p++)this.render(f[p]/l,g[p]);else{m.multiDrawElementsWEBGL(s,g,0,o,f,0,x);let p=0;for(let v=0;v<x;v++)p+=g[v];t.update(p,s,1)}}this.setMode=a,this.setIndex=c,this.render=h,this.renderInstances=u,this.renderMultiDraw=d}function hg(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(s/3);break;case i.LINES:t.lines+=o*(s/2);break;case i.LINE_STRIP:t.lines+=o*(s-1);break;case i.LINE_LOOP:t.lines+=o*s;break;case i.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function ug(i,e){return i[0]-e[0]}function dg(i,e){return Math.abs(e[1])-Math.abs(i[1])}function fg(i,e,t){const n={},r=new Float32Array(8),s=new WeakMap,a=new Qe,o=[];for(let c=0;c<8;c++)o[c]=[c,0];function l(c,h,u){const d=c.morphTargetInfluences;if(e.isWebGL2===!0){const f=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,g=f!==void 0?f.length:0;let x=s.get(h);if(x===void 0||x.count!==g){let I=function(){W.dispose(),s.delete(h),h.removeEventListener("dispose",I)};x!==void 0&&x.texture.dispose();const v=h.morphAttributes.position!==void 0,_=h.morphAttributes.normal!==void 0,b=h.morphAttributes.color!==void 0,C=h.morphAttributes.position||[],w=h.morphAttributes.normal||[],T=h.morphAttributes.color||[];let D=0;v===!0&&(D=1),_===!0&&(D=2),b===!0&&(D=3);let S=h.attributes.position.count*D,A=1;S>e.maxTextureSize&&(A=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);const N=new Float32Array(S*A*4*g),W=new mh(N,S,A,g);W.type=Pn,W.needsUpdate=!0;const Z=D*4;for(let F=0;F<g;F++){const z=C[F],$=w[F],X=T[F],Y=S*A*4*F;for(let q=0;q<z.count;q++){const J=q*Z;v===!0&&(a.fromBufferAttribute(z,q),N[Y+J+0]=a.x,N[Y+J+1]=a.y,N[Y+J+2]=a.z,N[Y+J+3]=0),_===!0&&(a.fromBufferAttribute($,q),N[Y+J+4]=a.x,N[Y+J+5]=a.y,N[Y+J+6]=a.z,N[Y+J+7]=0),b===!0&&(a.fromBufferAttribute(X,q),N[Y+J+8]=a.x,N[Y+J+9]=a.y,N[Y+J+10]=a.z,N[Y+J+11]=X.itemSize===4?a.w:1)}}x={count:g,texture:W,size:new Le(S,A)},s.set(h,x),h.addEventListener("dispose",I)}let m=0;for(let v=0;v<d.length;v++)m+=d[v];const p=h.morphTargetsRelative?1:1-m;u.getUniforms().setValue(i,"morphTargetBaseInfluence",p),u.getUniforms().setValue(i,"morphTargetInfluences",d),u.getUniforms().setValue(i,"morphTargetsTexture",x.texture,t),u.getUniforms().setValue(i,"morphTargetsTextureSize",x.size)}else{const f=d===void 0?0:d.length;let g=n[h.id];if(g===void 0||g.length!==f){g=[];for(let _=0;_<f;_++)g[_]=[_,0];n[h.id]=g}for(let _=0;_<f;_++){const b=g[_];b[0]=_,b[1]=d[_]}g.sort(dg);for(let _=0;_<8;_++)_<f&&g[_][1]?(o[_][0]=g[_][0],o[_][1]=g[_][1]):(o[_][0]=Number.MAX_SAFE_INTEGER,o[_][1]=0);o.sort(ug);const x=h.morphAttributes.position,m=h.morphAttributes.normal;let p=0;for(let _=0;_<8;_++){const b=o[_],C=b[0],w=b[1];C!==Number.MAX_SAFE_INTEGER&&w?(x&&h.getAttribute("morphTarget"+_)!==x[C]&&h.setAttribute("morphTarget"+_,x[C]),m&&h.getAttribute("morphNormal"+_)!==m[C]&&h.setAttribute("morphNormal"+_,m[C]),r[_]=w,p+=w):(x&&h.hasAttribute("morphTarget"+_)===!0&&h.deleteAttribute("morphTarget"+_),m&&h.hasAttribute("morphNormal"+_)===!0&&h.deleteAttribute("morphNormal"+_),r[_]=0)}const v=h.morphTargetsRelative?1:1-p;u.getUniforms().setValue(i,"morphTargetBaseInfluence",v),u.getUniforms().setValue(i,"morphTargetInfluences",r)}}return{update:l}}function pg(i,e,t,n){let r=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,u=e.get(l,h);if(r.get(u)!==c&&(e.update(u),r.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;r.get(d)!==c&&(d.update(),r.set(d,c))}return u}function a(){r=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:a}}class Mh extends Mt{constructor(e,t,n,r,s,a,o,l,c,h){if(h=h!==void 0?h:mi,h!==mi&&h!==sr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===mi&&(n=Hn),n===void 0&&h===sr&&(n=pi),super(null,r,s,a,o,l,h,n,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:At,this.minFilter=l!==void 0?l:At,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const Eh=new Mt,Ah=new Mh(1,1);Ah.compareFunction=uh;const Th=new mh,wh=new Zd,Rh=new Sh,Kl=[],Zl=[],Jl=new Float32Array(16),Ql=new Float32Array(9),ec=new Float32Array(4);function hr(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=Kl[r];if(s===void 0&&(s=new Float32Array(r),Kl[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function _t(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function xt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function js(i,e){let t=Zl[e];t===void 0&&(t=new Int32Array(e),Zl[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function mg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function gg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(_t(t,e))return;i.uniform2fv(this.addr,e),xt(t,e)}}function _g(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(_t(t,e))return;i.uniform3fv(this.addr,e),xt(t,e)}}function xg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(_t(t,e))return;i.uniform4fv(this.addr,e),xt(t,e)}}function vg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(_t(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),xt(t,e)}else{if(_t(t,n))return;ec.set(n),i.uniformMatrix2fv(this.addr,!1,ec),xt(t,n)}}function yg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(_t(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),xt(t,e)}else{if(_t(t,n))return;Ql.set(n),i.uniformMatrix3fv(this.addr,!1,Ql),xt(t,n)}}function Sg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(_t(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),xt(t,e)}else{if(_t(t,n))return;Jl.set(n),i.uniformMatrix4fv(this.addr,!1,Jl),xt(t,n)}}function bg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Mg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(_t(t,e))return;i.uniform2iv(this.addr,e),xt(t,e)}}function Eg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(_t(t,e))return;i.uniform3iv(this.addr,e),xt(t,e)}}function Ag(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(_t(t,e))return;i.uniform4iv(this.addr,e),xt(t,e)}}function Tg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function wg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(_t(t,e))return;i.uniform2uiv(this.addr,e),xt(t,e)}}function Rg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(_t(t,e))return;i.uniform3uiv(this.addr,e),xt(t,e)}}function Cg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(_t(t,e))return;i.uniform4uiv(this.addr,e),xt(t,e)}}function Pg(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);const s=this.type===i.SAMPLER_2D_SHADOW?Ah:Eh;t.setTexture2D(e||s,r)}function Lg(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||wh,r)}function Ig(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||Rh,r)}function Dg(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||Th,r)}function Ug(i){switch(i){case 5126:return mg;case 35664:return gg;case 35665:return _g;case 35666:return xg;case 35674:return vg;case 35675:return yg;case 35676:return Sg;case 5124:case 35670:return bg;case 35667:case 35671:return Mg;case 35668:case 35672:return Eg;case 35669:case 35673:return Ag;case 5125:return Tg;case 36294:return wg;case 36295:return Rg;case 36296:return Cg;case 35678:case 36198:case 36298:case 36306:case 35682:return Pg;case 35679:case 36299:case 36307:return Lg;case 35680:case 36300:case 36308:case 36293:return Ig;case 36289:case 36303:case 36311:case 36292:return Dg}}function Fg(i,e){i.uniform1fv(this.addr,e)}function Ng(i,e){const t=hr(e,this.size,2);i.uniform2fv(this.addr,t)}function Og(i,e){const t=hr(e,this.size,3);i.uniform3fv(this.addr,t)}function Bg(i,e){const t=hr(e,this.size,4);i.uniform4fv(this.addr,t)}function kg(i,e){const t=hr(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function zg(i,e){const t=hr(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Gg(i,e){const t=hr(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Vg(i,e){i.uniform1iv(this.addr,e)}function Hg(i,e){i.uniform2iv(this.addr,e)}function Wg(i,e){i.uniform3iv(this.addr,e)}function Xg(i,e){i.uniform4iv(this.addr,e)}function jg(i,e){i.uniform1uiv(this.addr,e)}function Yg(i,e){i.uniform2uiv(this.addr,e)}function $g(i,e){i.uniform3uiv(this.addr,e)}function qg(i,e){i.uniform4uiv(this.addr,e)}function Kg(i,e,t){const n=this.cache,r=e.length,s=js(t,r);_t(n,s)||(i.uniform1iv(this.addr,s),xt(n,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||Eh,s[a])}function Zg(i,e,t){const n=this.cache,r=e.length,s=js(t,r);_t(n,s)||(i.uniform1iv(this.addr,s),xt(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||wh,s[a])}function Jg(i,e,t){const n=this.cache,r=e.length,s=js(t,r);_t(n,s)||(i.uniform1iv(this.addr,s),xt(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Rh,s[a])}function Qg(i,e,t){const n=this.cache,r=e.length,s=js(t,r);_t(n,s)||(i.uniform1iv(this.addr,s),xt(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Th,s[a])}function e_(i){switch(i){case 5126:return Fg;case 35664:return Ng;case 35665:return Og;case 35666:return Bg;case 35674:return kg;case 35675:return zg;case 35676:return Gg;case 5124:case 35670:return Vg;case 35667:case 35671:return Hg;case 35668:case 35672:return Wg;case 35669:case 35673:return Xg;case 5125:return jg;case 36294:return Yg;case 36295:return $g;case 36296:return qg;case 35678:case 36198:case 36298:case 36306:case 35682:return Kg;case 35679:case 36299:case 36307:return Zg;case 35680:case 36300:case 36308:case 36293:return Jg;case 36289:case 36303:case 36311:case 36292:return Qg}}class t_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Ug(t.type)}}class n_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=e_(t.type)}}class i_{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],n)}}}const Ca=/(\w+)(\])?(\[|\.)?/g;function tc(i,e){i.seq.push(e),i.map[e.id]=e}function r_(i,e,t){const n=i.name,r=n.length;for(Ca.lastIndex=0;;){const s=Ca.exec(n),a=Ca.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){tc(t,c===void 0?new t_(o,i,e):new n_(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new i_(o),tc(t,u)),t=u}}}class ys{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);r_(s,a,this)}}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function nc(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const s_=37297;let a_=0;function o_(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}function l_(i){const e=et.getPrimaries(et.workingColorSpace),t=et.getPrimaries(i);let n;switch(e===t?n="":e===Cs&&t===Rs?n="LinearDisplayP3ToLinearSRGB":e===Rs&&t===Cs&&(n="LinearSRGBToLinearDisplayP3"),i){case In:case Ws:return[n,"LinearTransferOETF"];case ft:case yo:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",i),[n,"LinearTransferOETF"]}}function ic(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=i.getShaderInfoLog(e).trim();if(n&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+o_(i.getShaderSource(e),a)}else return r}function c_(i,e){const t=l_(e);return`vec4 ${i}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function h_(i,e){let t;switch(e){case id:t="Linear";break;case rd:t="Reinhard";break;case sd:t="OptimizedCineon";break;case ad:t="ACESFilmic";break;case ld:t="AgX";break;case od:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function u_(i){return[i.extensionDerivatives||i.envMapCubeUVHeight||i.bumpMap||i.normalMapTangentSpace||i.clearcoatNormalMap||i.flatShading||i.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(i.extensionFragDepth||i.logarithmicDepthBuffer)&&i.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",i.extensionDrawBuffers&&i.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(i.extensionShaderTextureLOD||i.envMap||i.transmission)&&i.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(Ki).join(`
`)}function d_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(Ki).join(`
`)}function f_(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function p_(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Ki(i){return i!==""}function rc(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function sc(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const m_=/^[ \t]*#include +<([\w\d./]+)>/gm;function ro(i){return i.replace(m_,__)}const g_=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function __(i,e){let t=Ge[e];if(t===void 0){const n=g_.get(e);if(n!==void 0)t=Ge[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return ro(t)}const x_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ac(i){return i.replace(x_,v_)}function v_(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function oc(i){let e="precision "+i.precision+` float;
precision `+i.precision+" int;";return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function y_(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===eh?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Lu?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Tn&&(e="SHADOWMAP_TYPE_VSM"),e}function S_(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case ir:case rr:e="ENVMAP_TYPE_CUBE";break;case Hs:e="ENVMAP_TYPE_CUBE_UV";break}return e}function b_(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case rr:e="ENVMAP_MODE_REFRACTION";break}return e}function M_(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Vs:e="ENVMAP_BLENDING_MULTIPLY";break;case td:e="ENVMAP_BLENDING_MIX";break;case nd:e="ENVMAP_BLENDING_ADD";break}return e}function E_(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function A_(i,e,t,n){const r=i.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=y_(t),c=S_(t),h=b_(t),u=M_(t),d=E_(t),f=t.isWebGL2?"":u_(t),g=d_(t),x=f_(s),m=r.createProgram();let p,v,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(Ki).join(`
`),p.length>0&&(p+=`
`),v=[f,"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(Ki).join(`
`),v.length>0&&(v+=`
`)):(p=[oc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ki).join(`
`),v=[f,oc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==jn?"#define TONE_MAPPING":"",t.toneMapping!==jn?Ge.tonemapping_pars_fragment:"",t.toneMapping!==jn?h_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ge.colorspace_pars_fragment,c_("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ki).join(`
`)),a=ro(a),a=rc(a,t),a=sc(a,t),o=ro(o),o=rc(o,t),o=sc(o,t),a=ac(a),o=ac(o),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,p=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,v=["precision mediump sampler2DArray;","#define varying in",t.glslVersion===Al?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Al?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+v);const b=_+p+a,C=_+v+o,w=nc(r,r.VERTEX_SHADER,b),T=nc(r,r.FRAGMENT_SHADER,C);r.attachShader(m,w),r.attachShader(m,T),t.index0AttributeName!==void 0?r.bindAttribLocation(m,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(m,0,"position"),r.linkProgram(m);function D(W){if(i.debug.checkShaderErrors){const Z=r.getProgramInfoLog(m).trim(),I=r.getShaderInfoLog(w).trim(),F=r.getShaderInfoLog(T).trim();let z=!0,$=!0;if(r.getProgramParameter(m,r.LINK_STATUS)===!1)if(z=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,m,w,T);else{const X=ic(r,w,"vertex"),Y=ic(r,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(m,r.VALIDATE_STATUS)+`

Program Info Log: `+Z+`
`+X+`
`+Y)}else Z!==""?console.warn("THREE.WebGLProgram: Program Info Log:",Z):(I===""||F==="")&&($=!1);$&&(W.diagnostics={runnable:z,programLog:Z,vertexShader:{log:I,prefix:p},fragmentShader:{log:F,prefix:v}})}r.deleteShader(w),r.deleteShader(T),S=new ys(r,m),A=p_(r,m)}let S;this.getUniforms=function(){return S===void 0&&D(this),S};let A;this.getAttributes=function(){return A===void 0&&D(this),A};let N=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return N===!1&&(N=r.getProgramParameter(m,s_)),N},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(m),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=a_++,this.cacheKey=e,this.usedTimes=1,this.program=m,this.vertexShader=w,this.fragmentShader=T,this}let T_=0;class w_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new R_(e),t.set(e,n)),n}}class R_{constructor(e){this.id=T_++,this.code=e,this.usedTimes=0}}function C_(i,e,t,n,r,s,a){const o=new gh,l=new w_,c=[],h=r.isWebGL2,u=r.logarithmicDepthBuffer,d=r.vertexTextures;let f=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(S){return S===0?"uv":`uv${S}`}function m(S,A,N,W,Z){const I=W.fog,F=Z.geometry,z=S.isMeshStandardMaterial?W.environment:null,$=(S.isMeshStandardMaterial?t:e).get(S.envMap||z),X=$&&$.mapping===Hs?$.image.height:null,Y=g[S.type];S.precision!==null&&(f=r.getMaxPrecision(S.precision),f!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",f,"instead."));const q=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,J=q!==void 0?q.length:0;let oe=0;F.morphAttributes.position!==void 0&&(oe=1),F.morphAttributes.normal!==void 0&&(oe=2),F.morphAttributes.color!==void 0&&(oe=3);let V,K,le,_e;if(Y){const ht=un[Y];V=ht.vertexShader,K=ht.fragmentShader}else V=S.vertexShader,K=S.fragmentShader,l.update(S),le=l.getVertexShaderID(S),_e=l.getFragmentShaderID(S);const ce=i.getRenderTarget(),Me=Z.isInstancedMesh===!0,De=Z.isBatchedMesh===!0,we=!!S.map,Ye=!!S.matcap,B=!!$,Et=!!S.aoMap,Ee=!!S.lightMap,Ue=!!S.bumpMap,xe=!!S.normalMap,tt=!!S.displacementMap,Be=!!S.emissiveMap,E=!!S.metalnessMap,y=!!S.roughnessMap,O=S.anisotropy>0,ne=S.clearcoat>0,ee=S.iridescence>0,ie=S.sheen>0,ve=S.transmission>0,de=O&&!!S.anisotropyMap,ge=ne&&!!S.clearcoatMap,Re=ne&&!!S.clearcoatNormalMap,ke=ne&&!!S.clearcoatRoughnessMap,Q=ee&&!!S.iridescenceMap,Je=ee&&!!S.iridescenceThicknessMap,Ve=ie&&!!S.sheenColorMap,Fe=ie&&!!S.sheenRoughnessMap,be=!!S.specularMap,fe=!!S.specularColorMap,R=!!S.specularIntensityMap,re=ve&&!!S.transmissionMap,ye=ve&&!!S.thicknessMap,me=!!S.gradientMap,te=!!S.alphaMap,L=S.alphaTest>0,se=!!S.alphaHash,ue=!!S.extensions,Ce=!!F.attributes.uv1,Ae=!!F.attributes.uv2,$e=!!F.attributes.uv3;let qe=jn;return S.toneMapped&&(ce===null||ce.isXRRenderTarget===!0)&&(qe=i.toneMapping),{isWebGL2:h,shaderID:Y,shaderType:S.type,shaderName:S.name,vertexShader:V,fragmentShader:K,defines:S.defines,customVertexShaderID:le,customFragmentShaderID:_e,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:f,batching:De,instancing:Me,instancingColor:Me&&Z.instanceColor!==null,supportsVertexTextures:d,outputColorSpace:ce===null?i.outputColorSpace:ce.isXRRenderTarget===!0?ce.texture.colorSpace:In,map:we,matcap:Ye,envMap:B,envMapMode:B&&$.mapping,envMapCubeUVHeight:X,aoMap:Et,lightMap:Ee,bumpMap:Ue,normalMap:xe,displacementMap:d&&tt,emissiveMap:Be,normalMapObjectSpace:xe&&S.normalMapType===Ed,normalMapTangentSpace:xe&&S.normalMapType===vo,metalnessMap:E,roughnessMap:y,anisotropy:O,anisotropyMap:de,clearcoat:ne,clearcoatMap:ge,clearcoatNormalMap:Re,clearcoatRoughnessMap:ke,iridescence:ee,iridescenceMap:Q,iridescenceThicknessMap:Je,sheen:ie,sheenColorMap:Ve,sheenRoughnessMap:Fe,specularMap:be,specularColorMap:fe,specularIntensityMap:R,transmission:ve,transmissionMap:re,thicknessMap:ye,gradientMap:me,opaque:S.transparent===!1&&S.blending===er,alphaMap:te,alphaTest:L,alphaHash:se,combine:S.combine,mapUv:we&&x(S.map.channel),aoMapUv:Et&&x(S.aoMap.channel),lightMapUv:Ee&&x(S.lightMap.channel),bumpMapUv:Ue&&x(S.bumpMap.channel),normalMapUv:xe&&x(S.normalMap.channel),displacementMapUv:tt&&x(S.displacementMap.channel),emissiveMapUv:Be&&x(S.emissiveMap.channel),metalnessMapUv:E&&x(S.metalnessMap.channel),roughnessMapUv:y&&x(S.roughnessMap.channel),anisotropyMapUv:de&&x(S.anisotropyMap.channel),clearcoatMapUv:ge&&x(S.clearcoatMap.channel),clearcoatNormalMapUv:Re&&x(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ke&&x(S.clearcoatRoughnessMap.channel),iridescenceMapUv:Q&&x(S.iridescenceMap.channel),iridescenceThicknessMapUv:Je&&x(S.iridescenceThicknessMap.channel),sheenColorMapUv:Ve&&x(S.sheenColorMap.channel),sheenRoughnessMapUv:Fe&&x(S.sheenRoughnessMap.channel),specularMapUv:be&&x(S.specularMap.channel),specularColorMapUv:fe&&x(S.specularColorMap.channel),specularIntensityMapUv:R&&x(S.specularIntensityMap.channel),transmissionMapUv:re&&x(S.transmissionMap.channel),thicknessMapUv:ye&&x(S.thicknessMap.channel),alphaMapUv:te&&x(S.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(xe||O),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,vertexUv1s:Ce,vertexUv2s:Ae,vertexUv3s:$e,pointsUvs:Z.isPoints===!0&&!!F.attributes.uv&&(we||te),fog:!!I,useFog:S.fog===!0,fogExp2:I&&I.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:u,skinning:Z.isSkinnedMesh===!0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:J,morphTextureStride:oe,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:S.dithering,shadowMapEnabled:i.shadowMap.enabled&&N.length>0,shadowMapType:i.shadowMap.type,toneMapping:qe,useLegacyLights:i._useLegacyLights,decodeVideoTexture:we&&S.map.isVideoTexture===!0&&et.getTransfer(S.map.colorSpace)===nt,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===pn,flipSided:S.side===Vt,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionDerivatives:ue&&S.extensions.derivatives===!0,extensionFragDepth:ue&&S.extensions.fragDepth===!0,extensionDrawBuffers:ue&&S.extensions.drawBuffers===!0,extensionShaderTextureLOD:ue&&S.extensions.shaderTextureLOD===!0,extensionClipCullDistance:ue&&S.extensions.clipCullDistance&&n.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:h||n.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||n.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||n.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()}}function p(S){const A=[];if(S.shaderID?A.push(S.shaderID):(A.push(S.customVertexShaderID),A.push(S.customFragmentShaderID)),S.defines!==void 0)for(const N in S.defines)A.push(N),A.push(S.defines[N]);return S.isRawShaderMaterial===!1&&(v(A,S),_(A,S),A.push(i.outputColorSpace)),A.push(S.customProgramCacheKey),A.join()}function v(S,A){S.push(A.precision),S.push(A.outputColorSpace),S.push(A.envMapMode),S.push(A.envMapCubeUVHeight),S.push(A.mapUv),S.push(A.alphaMapUv),S.push(A.lightMapUv),S.push(A.aoMapUv),S.push(A.bumpMapUv),S.push(A.normalMapUv),S.push(A.displacementMapUv),S.push(A.emissiveMapUv),S.push(A.metalnessMapUv),S.push(A.roughnessMapUv),S.push(A.anisotropyMapUv),S.push(A.clearcoatMapUv),S.push(A.clearcoatNormalMapUv),S.push(A.clearcoatRoughnessMapUv),S.push(A.iridescenceMapUv),S.push(A.iridescenceThicknessMapUv),S.push(A.sheenColorMapUv),S.push(A.sheenRoughnessMapUv),S.push(A.specularMapUv),S.push(A.specularColorMapUv),S.push(A.specularIntensityMapUv),S.push(A.transmissionMapUv),S.push(A.thicknessMapUv),S.push(A.combine),S.push(A.fogExp2),S.push(A.sizeAttenuation),S.push(A.morphTargetsCount),S.push(A.morphAttributeCount),S.push(A.numDirLights),S.push(A.numPointLights),S.push(A.numSpotLights),S.push(A.numSpotLightMaps),S.push(A.numHemiLights),S.push(A.numRectAreaLights),S.push(A.numDirLightShadows),S.push(A.numPointLightShadows),S.push(A.numSpotLightShadows),S.push(A.numSpotLightShadowsWithMaps),S.push(A.numLightProbes),S.push(A.shadowMapType),S.push(A.toneMapping),S.push(A.numClippingPlanes),S.push(A.numClipIntersection),S.push(A.depthPacking)}function _(S,A){o.disableAll(),A.isWebGL2&&o.enable(0),A.supportsVertexTextures&&o.enable(1),A.instancing&&o.enable(2),A.instancingColor&&o.enable(3),A.matcap&&o.enable(4),A.envMap&&o.enable(5),A.normalMapObjectSpace&&o.enable(6),A.normalMapTangentSpace&&o.enable(7),A.clearcoat&&o.enable(8),A.iridescence&&o.enable(9),A.alphaTest&&o.enable(10),A.vertexColors&&o.enable(11),A.vertexAlphas&&o.enable(12),A.vertexUv1s&&o.enable(13),A.vertexUv2s&&o.enable(14),A.vertexUv3s&&o.enable(15),A.vertexTangents&&o.enable(16),A.anisotropy&&o.enable(17),A.alphaHash&&o.enable(18),A.batching&&o.enable(19),S.push(o.mask),o.disableAll(),A.fog&&o.enable(0),A.useFog&&o.enable(1),A.flatShading&&o.enable(2),A.logarithmicDepthBuffer&&o.enable(3),A.skinning&&o.enable(4),A.morphTargets&&o.enable(5),A.morphNormals&&o.enable(6),A.morphColors&&o.enable(7),A.premultipliedAlpha&&o.enable(8),A.shadowMapEnabled&&o.enable(9),A.useLegacyLights&&o.enable(10),A.doubleSided&&o.enable(11),A.flipSided&&o.enable(12),A.useDepthPacking&&o.enable(13),A.dithering&&o.enable(14),A.transmission&&o.enable(15),A.sheen&&o.enable(16),A.opaque&&o.enable(17),A.pointsUvs&&o.enable(18),A.decodeVideoTexture&&o.enable(19),S.push(o.mask)}function b(S){const A=g[S.type];let N;if(A){const W=un[A];N=uf.clone(W.uniforms)}else N=S.uniforms;return N}function C(S,A){let N;for(let W=0,Z=c.length;W<Z;W++){const I=c[W];if(I.cacheKey===A){N=I,++N.usedTimes;break}}return N===void 0&&(N=new A_(i,A,S,s),c.push(N)),N}function w(S){if(--S.usedTimes===0){const A=c.indexOf(S);c[A]=c[c.length-1],c.pop(),S.destroy()}}function T(S){l.remove(S)}function D(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:b,acquireProgram:C,releaseProgram:w,releaseShaderCache:T,programs:c,dispose:D}}function P_(){let i=new WeakMap;function e(s){let a=i.get(s);return a===void 0&&(a={},i.set(s,a)),a}function t(s){i.delete(s)}function n(s,a,o){i.get(s)[a]=o}function r(){i=new WeakMap}return{get:e,remove:t,update:n,dispose:r}}function L_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function lc(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function cc(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function a(u,d,f,g,x,m){let p=i[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},i[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=x,p.group=m),e++,p}function o(u,d,f,g,x,m){const p=a(u,d,f,g,x,m);f.transmission>0?n.push(p):f.transparent===!0?r.push(p):t.push(p)}function l(u,d,f,g,x,m){const p=a(u,d,f,g,x,m);f.transmission>0?n.unshift(p):f.transparent===!0?r.unshift(p):t.unshift(p)}function c(u,d){t.length>1&&t.sort(u||L_),n.length>1&&n.sort(d||lc),r.length>1&&r.sort(d||lc)}function h(){for(let u=e,d=i.length;u<d;u++){const f=i[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:o,unshift:l,finish:h,sort:c}}function I_(){let i=new WeakMap;function e(n,r){const s=i.get(n);let a;return s===void 0?(a=new cc,i.set(n,[a])):r>=s.length?(a=new cc,s.push(a)):a=s[r],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function D_(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new P,color:new Ie};break;case"SpotLight":t={position:new P,direction:new P,color:new Ie,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new Ie,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new Ie,groundColor:new Ie};break;case"RectAreaLight":t={color:new Ie,position:new P,halfWidth:new P,halfHeight:new P};break}return i[e.id]=t,t}}}function U_(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Le};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Le};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Le,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let F_=0;function N_(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function O_(i,e){const t=new D_,n=U_(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)r.probe.push(new P);const s=new P,a=new Te,o=new Te;function l(h,u){let d=0,f=0,g=0;for(let W=0;W<9;W++)r.probe[W].set(0,0,0);let x=0,m=0,p=0,v=0,_=0,b=0,C=0,w=0,T=0,D=0,S=0;h.sort(N_);const A=u===!0?Math.PI:1;for(let W=0,Z=h.length;W<Z;W++){const I=h[W],F=I.color,z=I.intensity,$=I.distance,X=I.shadow&&I.shadow.map?I.shadow.map.texture:null;if(I.isAmbientLight)d+=F.r*z*A,f+=F.g*z*A,g+=F.b*z*A;else if(I.isLightProbe){for(let Y=0;Y<9;Y++)r.probe[Y].addScaledVector(I.sh.coefficients[Y],z);S++}else if(I.isDirectionalLight){const Y=t.get(I);if(Y.color.copy(I.color).multiplyScalar(I.intensity*A),I.castShadow){const q=I.shadow,J=n.get(I);J.shadowBias=q.bias,J.shadowNormalBias=q.normalBias,J.shadowRadius=q.radius,J.shadowMapSize=q.mapSize,r.directionalShadow[x]=J,r.directionalShadowMap[x]=X,r.directionalShadowMatrix[x]=I.shadow.matrix,b++}r.directional[x]=Y,x++}else if(I.isSpotLight){const Y=t.get(I);Y.position.setFromMatrixPosition(I.matrixWorld),Y.color.copy(F).multiplyScalar(z*A),Y.distance=$,Y.coneCos=Math.cos(I.angle),Y.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),Y.decay=I.decay,r.spot[p]=Y;const q=I.shadow;if(I.map&&(r.spotLightMap[T]=I.map,T++,q.updateMatrices(I),I.castShadow&&D++),r.spotLightMatrix[p]=q.matrix,I.castShadow){const J=n.get(I);J.shadowBias=q.bias,J.shadowNormalBias=q.normalBias,J.shadowRadius=q.radius,J.shadowMapSize=q.mapSize,r.spotShadow[p]=J,r.spotShadowMap[p]=X,w++}p++}else if(I.isRectAreaLight){const Y=t.get(I);Y.color.copy(F).multiplyScalar(z),Y.halfWidth.set(I.width*.5,0,0),Y.halfHeight.set(0,I.height*.5,0),r.rectArea[v]=Y,v++}else if(I.isPointLight){const Y=t.get(I);if(Y.color.copy(I.color).multiplyScalar(I.intensity*A),Y.distance=I.distance,Y.decay=I.decay,I.castShadow){const q=I.shadow,J=n.get(I);J.shadowBias=q.bias,J.shadowNormalBias=q.normalBias,J.shadowRadius=q.radius,J.shadowMapSize=q.mapSize,J.shadowCameraNear=q.camera.near,J.shadowCameraFar=q.camera.far,r.pointShadow[m]=J,r.pointShadowMap[m]=X,r.pointShadowMatrix[m]=I.shadow.matrix,C++}r.point[m]=Y,m++}else if(I.isHemisphereLight){const Y=t.get(I);Y.skyColor.copy(I.color).multiplyScalar(z*A),Y.groundColor.copy(I.groundColor).multiplyScalar(z*A),r.hemi[_]=Y,_++}}v>0&&(e.isWebGL2?i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ae.LTC_FLOAT_1,r.rectAreaLTC2=ae.LTC_FLOAT_2):(r.rectAreaLTC1=ae.LTC_HALF_1,r.rectAreaLTC2=ae.LTC_HALF_2):i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ae.LTC_FLOAT_1,r.rectAreaLTC2=ae.LTC_FLOAT_2):i.has("OES_texture_half_float_linear")===!0?(r.rectAreaLTC1=ae.LTC_HALF_1,r.rectAreaLTC2=ae.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),r.ambient[0]=d,r.ambient[1]=f,r.ambient[2]=g;const N=r.hash;(N.directionalLength!==x||N.pointLength!==m||N.spotLength!==p||N.rectAreaLength!==v||N.hemiLength!==_||N.numDirectionalShadows!==b||N.numPointShadows!==C||N.numSpotShadows!==w||N.numSpotMaps!==T||N.numLightProbes!==S)&&(r.directional.length=x,r.spot.length=p,r.rectArea.length=v,r.point.length=m,r.hemi.length=_,r.directionalShadow.length=b,r.directionalShadowMap.length=b,r.pointShadow.length=C,r.pointShadowMap.length=C,r.spotShadow.length=w,r.spotShadowMap.length=w,r.directionalShadowMatrix.length=b,r.pointShadowMatrix.length=C,r.spotLightMatrix.length=w+T-D,r.spotLightMap.length=T,r.numSpotLightShadowsWithMaps=D,r.numLightProbes=S,N.directionalLength=x,N.pointLength=m,N.spotLength=p,N.rectAreaLength=v,N.hemiLength=_,N.numDirectionalShadows=b,N.numPointShadows=C,N.numSpotShadows=w,N.numSpotMaps=T,N.numLightProbes=S,r.version=F_++)}function c(h,u){let d=0,f=0,g=0,x=0,m=0;const p=u.matrixWorldInverse;for(let v=0,_=h.length;v<_;v++){const b=h[v];if(b.isDirectionalLight){const C=r.directional[d];C.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),C.direction.sub(s),C.direction.transformDirection(p),d++}else if(b.isSpotLight){const C=r.spot[g];C.position.setFromMatrixPosition(b.matrixWorld),C.position.applyMatrix4(p),C.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),C.direction.sub(s),C.direction.transformDirection(p),g++}else if(b.isRectAreaLight){const C=r.rectArea[x];C.position.setFromMatrixPosition(b.matrixWorld),C.position.applyMatrix4(p),o.identity(),a.copy(b.matrixWorld),a.premultiply(p),o.extractRotation(a),C.halfWidth.set(b.width*.5,0,0),C.halfHeight.set(0,b.height*.5,0),C.halfWidth.applyMatrix4(o),C.halfHeight.applyMatrix4(o),x++}else if(b.isPointLight){const C=r.point[f];C.position.setFromMatrixPosition(b.matrixWorld),C.position.applyMatrix4(p),f++}else if(b.isHemisphereLight){const C=r.hemi[m];C.direction.setFromMatrixPosition(b.matrixWorld),C.direction.transformDirection(p),m++}}}return{setup:l,setupView:c,state:r}}function hc(i,e){const t=new O_(i,e),n=[],r=[];function s(){n.length=0,r.length=0}function a(u){n.push(u)}function o(u){r.push(u)}function l(u){t.setup(n,u)}function c(u){t.setupView(n,u)}return{init:s,state:{lightsArray:n,shadowsArray:r,lights:t},setupLights:l,setupLightsView:c,pushLight:a,pushShadow:o}}function B_(i,e){let t=new WeakMap;function n(s,a=0){const o=t.get(s);let l;return o===void 0?(l=new hc(i,e),t.set(s,[l])):a>=o.length?(l=new hc(i,e),o.push(l)):l=o[a],l}function r(){t=new WeakMap}return{get:n,dispose:r}}class k_ extends Ei{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=bd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class z_ extends Ei{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const G_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,V_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function H_(i,e,t){let n=new Mo;const r=new Le,s=new Le,a=new Qe,o=new k_({depthPacking:Md}),l=new z_,c={},h=t.maxTextureSize,u={[Kn]:Vt,[Vt]:Kn,[pn]:pn},d=new vi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Le},radius:{value:4}},vertexShader:G_,fragmentShader:V_}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new It;g.setAttribute("position",new Ht(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new kt(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=eh;let p=this.type;this.render=function(w,T,D){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const S=i.getRenderTarget(),A=i.getActiveCubeFace(),N=i.getActiveMipmapLevel(),W=i.state;W.setBlending(Xn),W.buffers.color.setClear(1,1,1,1),W.buffers.depth.setTest(!0),W.setScissorTest(!1);const Z=p!==Tn&&this.type===Tn,I=p===Tn&&this.type!==Tn;for(let F=0,z=w.length;F<z;F++){const $=w[F],X=$.shadow;if(X===void 0){console.warn("THREE.WebGLShadowMap:",$,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;r.copy(X.mapSize);const Y=X.getFrameExtents();if(r.multiply(Y),s.copy(X.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/Y.x),r.x=s.x*Y.x,X.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/Y.y),r.y=s.y*Y.y,X.mapSize.y=s.y)),X.map===null||Z===!0||I===!0){const J=this.type!==Tn?{minFilter:At,magFilter:At}:{};X.map!==null&&X.map.dispose(),X.map=new xi(r.x,r.y,J),X.map.texture.name=$.name+".shadowMap",X.camera.updateProjectionMatrix()}i.setRenderTarget(X.map),i.clear();const q=X.getViewportCount();for(let J=0;J<q;J++){const oe=X.getViewport(J);a.set(s.x*oe.x,s.y*oe.y,s.x*oe.z,s.y*oe.w),W.viewport(a),X.updateMatrices($,J),n=X.getFrustum(),b(T,D,X.camera,$,this.type)}X.isPointLightShadow!==!0&&this.type===Tn&&v(X,D),X.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(S,A,N)};function v(w,T){const D=e.update(x);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new xi(r.x,r.y)),d.uniforms.shadow_pass.value=w.map.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(T,null,D,d,x,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(T,null,D,f,x,null)}function _(w,T,D,S){let A=null;const N=D.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(N!==void 0)A=N;else if(A=D.isPointLight===!0?l:o,i.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0){const W=A.uuid,Z=T.uuid;let I=c[W];I===void 0&&(I={},c[W]=I);let F=I[Z];F===void 0&&(F=A.clone(),I[Z]=F,T.addEventListener("dispose",C)),A=F}if(A.visible=T.visible,A.wireframe=T.wireframe,S===Tn?A.side=T.shadowSide!==null?T.shadowSide:T.side:A.side=T.shadowSide!==null?T.shadowSide:u[T.side],A.alphaMap=T.alphaMap,A.alphaTest=T.alphaTest,A.map=T.map,A.clipShadows=T.clipShadows,A.clippingPlanes=T.clippingPlanes,A.clipIntersection=T.clipIntersection,A.displacementMap=T.displacementMap,A.displacementScale=T.displacementScale,A.displacementBias=T.displacementBias,A.wireframeLinewidth=T.wireframeLinewidth,A.linewidth=T.linewidth,D.isPointLight===!0&&A.isMeshDistanceMaterial===!0){const W=i.properties.get(A);W.light=D}return A}function b(w,T,D,S,A){if(w.visible===!1)return;if(w.layers.test(T.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&A===Tn)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(D.matrixWorldInverse,w.matrixWorld);const Z=e.update(w),I=w.material;if(Array.isArray(I)){const F=Z.groups;for(let z=0,$=F.length;z<$;z++){const X=F[z],Y=I[X.materialIndex];if(Y&&Y.visible){const q=_(w,Y,S,A);w.onBeforeShadow(i,w,T,D,Z,q,X),i.renderBufferDirect(D,null,Z,q,w,X),w.onAfterShadow(i,w,T,D,Z,q,X)}}}else if(I.visible){const F=_(w,I,S,A);w.onBeforeShadow(i,w,T,D,Z,F,null),i.renderBufferDirect(D,null,Z,F,w,null),w.onAfterShadow(i,w,T,D,Z,F,null)}}const W=w.children;for(let Z=0,I=W.length;Z<I;Z++)b(W[Z],T,D,S,A)}function C(w){w.target.removeEventListener("dispose",C);for(const D in c){const S=c[D],A=w.target.uuid;A in S&&(S[A].dispose(),delete S[A])}}}function W_(i,e,t){const n=t.isWebGL2;function r(){let L=!1;const se=new Qe;let ue=null;const Ce=new Qe(0,0,0,0);return{setMask:function(Ae){ue!==Ae&&!L&&(i.colorMask(Ae,Ae,Ae,Ae),ue=Ae)},setLocked:function(Ae){L=Ae},setClear:function(Ae,$e,qe,ot,ht){ht===!0&&(Ae*=ot,$e*=ot,qe*=ot),se.set(Ae,$e,qe,ot),Ce.equals(se)===!1&&(i.clearColor(Ae,$e,qe,ot),Ce.copy(se))},reset:function(){L=!1,ue=null,Ce.set(-1,0,0,0)}}}function s(){let L=!1,se=null,ue=null,Ce=null;return{setTest:function(Ae){Ae?De(i.DEPTH_TEST):we(i.DEPTH_TEST)},setMask:function(Ae){se!==Ae&&!L&&(i.depthMask(Ae),se=Ae)},setFunc:function(Ae){if(ue!==Ae){switch(Ae){case $u:i.depthFunc(i.NEVER);break;case qu:i.depthFunc(i.ALWAYS);break;case Ku:i.depthFunc(i.LESS);break;case bs:i.depthFunc(i.LEQUAL);break;case Zu:i.depthFunc(i.EQUAL);break;case Ju:i.depthFunc(i.GEQUAL);break;case Qu:i.depthFunc(i.GREATER);break;case ed:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ue=Ae}},setLocked:function(Ae){L=Ae},setClear:function(Ae){Ce!==Ae&&(i.clearDepth(Ae),Ce=Ae)},reset:function(){L=!1,se=null,ue=null,Ce=null}}}function a(){let L=!1,se=null,ue=null,Ce=null,Ae=null,$e=null,qe=null,ot=null,ht=null;return{setTest:function(Ze){L||(Ze?De(i.STENCIL_TEST):we(i.STENCIL_TEST))},setMask:function(Ze){se!==Ze&&!L&&(i.stencilMask(Ze),se=Ze)},setFunc:function(Ze,pt,hn){(ue!==Ze||Ce!==pt||Ae!==hn)&&(i.stencilFunc(Ze,pt,hn),ue=Ze,Ce=pt,Ae=hn)},setOp:function(Ze,pt,hn){($e!==Ze||qe!==pt||ot!==hn)&&(i.stencilOp(Ze,pt,hn),$e=Ze,qe=pt,ot=hn)},setLocked:function(Ze){L=Ze},setClear:function(Ze){ht!==Ze&&(i.clearStencil(Ze),ht=Ze)},reset:function(){L=!1,se=null,ue=null,Ce=null,Ae=null,$e=null,qe=null,ot=null,ht=null}}}const o=new r,l=new s,c=new a,h=new WeakMap,u=new WeakMap;let d={},f={},g=new WeakMap,x=[],m=null,p=!1,v=null,_=null,b=null,C=null,w=null,T=null,D=null,S=new Ie(0,0,0),A=0,N=!1,W=null,Z=null,I=null,F=null,z=null;const $=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let X=!1,Y=0;const q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(Y=parseFloat(/^WebGL (\d)/.exec(q)[1]),X=Y>=1):q.indexOf("OpenGL ES")!==-1&&(Y=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),X=Y>=2);let J=null,oe={};const V=i.getParameter(i.SCISSOR_BOX),K=i.getParameter(i.VIEWPORT),le=new Qe().fromArray(V),_e=new Qe().fromArray(K);function ce(L,se,ue,Ce){const Ae=new Uint8Array(4),$e=i.createTexture();i.bindTexture(L,$e),i.texParameteri(L,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(L,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let qe=0;qe<ue;qe++)n&&(L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY)?i.texImage3D(se,0,i.RGBA,1,1,Ce,0,i.RGBA,i.UNSIGNED_BYTE,Ae):i.texImage2D(se+qe,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Ae);return $e}const Me={};Me[i.TEXTURE_2D]=ce(i.TEXTURE_2D,i.TEXTURE_2D,1),Me[i.TEXTURE_CUBE_MAP]=ce(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),n&&(Me[i.TEXTURE_2D_ARRAY]=ce(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Me[i.TEXTURE_3D]=ce(i.TEXTURE_3D,i.TEXTURE_3D,1,1)),o.setClear(0,0,0,1),l.setClear(1),c.setClear(0),De(i.DEPTH_TEST),l.setFunc(bs),Be(!1),E(Wo),De(i.CULL_FACE),xe(Xn);function De(L){d[L]!==!0&&(i.enable(L),d[L]=!0)}function we(L){d[L]!==!1&&(i.disable(L),d[L]=!1)}function Ye(L,se){return f[L]!==se?(i.bindFramebuffer(L,se),f[L]=se,n&&(L===i.DRAW_FRAMEBUFFER&&(f[i.FRAMEBUFFER]=se),L===i.FRAMEBUFFER&&(f[i.DRAW_FRAMEBUFFER]=se)),!0):!1}function B(L,se){let ue=x,Ce=!1;if(L)if(ue=g.get(se),ue===void 0&&(ue=[],g.set(se,ue)),L.isWebGLMultipleRenderTargets){const Ae=L.texture;if(ue.length!==Ae.length||ue[0]!==i.COLOR_ATTACHMENT0){for(let $e=0,qe=Ae.length;$e<qe;$e++)ue[$e]=i.COLOR_ATTACHMENT0+$e;ue.length=Ae.length,Ce=!0}}else ue[0]!==i.COLOR_ATTACHMENT0&&(ue[0]=i.COLOR_ATTACHMENT0,Ce=!0);else ue[0]!==i.BACK&&(ue[0]=i.BACK,Ce=!0);Ce&&(t.isWebGL2?i.drawBuffers(ue):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(ue))}function Et(L){return m!==L?(i.useProgram(L),m=L,!0):!1}const Ee={[hi]:i.FUNC_ADD,[Du]:i.FUNC_SUBTRACT,[Uu]:i.FUNC_REVERSE_SUBTRACT};if(n)Ee[$o]=i.MIN,Ee[qo]=i.MAX;else{const L=e.get("EXT_blend_minmax");L!==null&&(Ee[$o]=L.MIN_EXT,Ee[qo]=L.MAX_EXT)}const Ue={[Fu]:i.ZERO,[Nu]:i.ONE,[Ou]:i.SRC_COLOR,[Ja]:i.SRC_ALPHA,[Hu]:i.SRC_ALPHA_SATURATE,[Gu]:i.DST_COLOR,[ku]:i.DST_ALPHA,[Bu]:i.ONE_MINUS_SRC_COLOR,[Qa]:i.ONE_MINUS_SRC_ALPHA,[Vu]:i.ONE_MINUS_DST_COLOR,[zu]:i.ONE_MINUS_DST_ALPHA,[Wu]:i.CONSTANT_COLOR,[Xu]:i.ONE_MINUS_CONSTANT_COLOR,[ju]:i.CONSTANT_ALPHA,[Yu]:i.ONE_MINUS_CONSTANT_ALPHA};function xe(L,se,ue,Ce,Ae,$e,qe,ot,ht,Ze){if(L===Xn){p===!0&&(we(i.BLEND),p=!1);return}if(p===!1&&(De(i.BLEND),p=!0),L!==Iu){if(L!==v||Ze!==N){if((_!==hi||w!==hi)&&(i.blendEquation(i.FUNC_ADD),_=hi,w=hi),Ze)switch(L){case er:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Xo:i.blendFunc(i.ONE,i.ONE);break;case jo:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Yo:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}else switch(L){case er:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Xo:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case jo:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Yo:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}b=null,C=null,T=null,D=null,S.set(0,0,0),A=0,v=L,N=Ze}return}Ae=Ae||se,$e=$e||ue,qe=qe||Ce,(se!==_||Ae!==w)&&(i.blendEquationSeparate(Ee[se],Ee[Ae]),_=se,w=Ae),(ue!==b||Ce!==C||$e!==T||qe!==D)&&(i.blendFuncSeparate(Ue[ue],Ue[Ce],Ue[$e],Ue[qe]),b=ue,C=Ce,T=$e,D=qe),(ot.equals(S)===!1||ht!==A)&&(i.blendColor(ot.r,ot.g,ot.b,ht),S.copy(ot),A=ht),v=L,N=!1}function tt(L,se){L.side===pn?we(i.CULL_FACE):De(i.CULL_FACE);let ue=L.side===Vt;se&&(ue=!ue),Be(ue),L.blending===er&&L.transparent===!1?xe(Xn):xe(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),l.setFunc(L.depthFunc),l.setTest(L.depthTest),l.setMask(L.depthWrite),o.setMask(L.colorWrite);const Ce=L.stencilWrite;c.setTest(Ce),Ce&&(c.setMask(L.stencilWriteMask),c.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),c.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),O(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?De(i.SAMPLE_ALPHA_TO_COVERAGE):we(i.SAMPLE_ALPHA_TO_COVERAGE)}function Be(L){W!==L&&(L?i.frontFace(i.CW):i.frontFace(i.CCW),W=L)}function E(L){L!==Cu?(De(i.CULL_FACE),L!==Z&&(L===Wo?i.cullFace(i.BACK):L===Pu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):we(i.CULL_FACE),Z=L}function y(L){L!==I&&(X&&i.lineWidth(L),I=L)}function O(L,se,ue){L?(De(i.POLYGON_OFFSET_FILL),(F!==se||z!==ue)&&(i.polygonOffset(se,ue),F=se,z=ue)):we(i.POLYGON_OFFSET_FILL)}function ne(L){L?De(i.SCISSOR_TEST):we(i.SCISSOR_TEST)}function ee(L){L===void 0&&(L=i.TEXTURE0+$-1),J!==L&&(i.activeTexture(L),J=L)}function ie(L,se,ue){ue===void 0&&(J===null?ue=i.TEXTURE0+$-1:ue=J);let Ce=oe[ue];Ce===void 0&&(Ce={type:void 0,texture:void 0},oe[ue]=Ce),(Ce.type!==L||Ce.texture!==se)&&(J!==ue&&(i.activeTexture(ue),J=ue),i.bindTexture(L,se||Me[L]),Ce.type=L,Ce.texture=se)}function ve(){const L=oe[J];L!==void 0&&L.type!==void 0&&(i.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function de(){try{i.compressedTexImage2D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ge(){try{i.compressedTexImage3D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Re(){try{i.texSubImage2D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ke(){try{i.texSubImage3D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Q(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Je(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Ve(){try{i.texStorage2D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Fe(){try{i.texStorage3D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function be(){try{i.texImage2D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function fe(){try{i.texImage3D.apply(i,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function R(L){le.equals(L)===!1&&(i.scissor(L.x,L.y,L.z,L.w),le.copy(L))}function re(L){_e.equals(L)===!1&&(i.viewport(L.x,L.y,L.z,L.w),_e.copy(L))}function ye(L,se){let ue=u.get(se);ue===void 0&&(ue=new WeakMap,u.set(se,ue));let Ce=ue.get(L);Ce===void 0&&(Ce=i.getUniformBlockIndex(se,L.name),ue.set(L,Ce))}function me(L,se){const Ce=u.get(se).get(L);h.get(se)!==Ce&&(i.uniformBlockBinding(se,Ce,L.__bindingPointIndex),h.set(se,Ce))}function te(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),n===!0&&(i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null)),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),d={},J=null,oe={},f={},g=new WeakMap,x=[],m=null,p=!1,v=null,_=null,b=null,C=null,w=null,T=null,D=null,S=new Ie(0,0,0),A=0,N=!1,W=null,Z=null,I=null,F=null,z=null,le.set(0,0,i.canvas.width,i.canvas.height),_e.set(0,0,i.canvas.width,i.canvas.height),o.reset(),l.reset(),c.reset()}return{buffers:{color:o,depth:l,stencil:c},enable:De,disable:we,bindFramebuffer:Ye,drawBuffers:B,useProgram:Et,setBlending:xe,setMaterial:tt,setFlipSided:Be,setCullFace:E,setLineWidth:y,setPolygonOffset:O,setScissorTest:ne,activeTexture:ee,bindTexture:ie,unbindTexture:ve,compressedTexImage2D:de,compressedTexImage3D:ge,texImage2D:be,texImage3D:fe,updateUBOMapping:ye,uniformBlockBinding:me,texStorage2D:Ve,texStorage3D:Fe,texSubImage2D:Re,texSubImage3D:ke,compressedTexSubImage2D:Q,compressedTexSubImage3D:Je,scissor:R,viewport:re,reset:te}}function X_(i,e,t,n,r,s,a){const o=r.isWebGL2,l=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new WeakMap;let u;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(E,y){return f?new OffscreenCanvas(E,y):Cr("canvas")}function x(E,y,O,ne){let ee=1;if((E.width>ne||E.height>ne)&&(ee=ne/Math.max(E.width,E.height)),ee<1||y===!0)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap){const ie=y?Is:Math.floor,ve=ie(ee*E.width),de=ie(ee*E.height);u===void 0&&(u=g(ve,de));const ge=O?g(ve,de):u;return ge.width=ve,ge.height=de,ge.getContext("2d").drawImage(E,0,0,ve,de),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+E.width+"x"+E.height+") to ("+ve+"x"+de+")."),ge}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+E.width+"x"+E.height+")."),E;return E}function m(E){return io(E.width)&&io(E.height)}function p(E){return o?!1:E.wrapS!==Yt||E.wrapT!==Yt||E.minFilter!==At&&E.minFilter!==Qt}function v(E,y){return E.generateMipmaps&&y&&E.minFilter!==At&&E.minFilter!==Qt}function _(E){i.generateMipmap(E)}function b(E,y,O,ne,ee=!1){if(o===!1)return y;if(E!==null){if(i[E]!==void 0)return i[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let ie=y;if(y===i.RED&&(O===i.FLOAT&&(ie=i.R32F),O===i.HALF_FLOAT&&(ie=i.R16F),O===i.UNSIGNED_BYTE&&(ie=i.R8)),y===i.RED_INTEGER&&(O===i.UNSIGNED_BYTE&&(ie=i.R8UI),O===i.UNSIGNED_SHORT&&(ie=i.R16UI),O===i.UNSIGNED_INT&&(ie=i.R32UI),O===i.BYTE&&(ie=i.R8I),O===i.SHORT&&(ie=i.R16I),O===i.INT&&(ie=i.R32I)),y===i.RG&&(O===i.FLOAT&&(ie=i.RG32F),O===i.HALF_FLOAT&&(ie=i.RG16F),O===i.UNSIGNED_BYTE&&(ie=i.RG8)),y===i.RGBA){const ve=ee?ws:et.getTransfer(ne);O===i.FLOAT&&(ie=i.RGBA32F),O===i.HALF_FLOAT&&(ie=i.RGBA16F),O===i.UNSIGNED_BYTE&&(ie=ve===nt?i.SRGB8_ALPHA8:i.RGBA8),O===i.UNSIGNED_SHORT_4_4_4_4&&(ie=i.RGBA4),O===i.UNSIGNED_SHORT_5_5_5_1&&(ie=i.RGB5_A1)}return(ie===i.R16F||ie===i.R32F||ie===i.RG16F||ie===i.RG32F||ie===i.RGBA16F||ie===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ie}function C(E,y,O){return v(E,O)===!0||E.isFramebufferTexture&&E.minFilter!==At&&E.minFilter!==Qt?Math.log2(Math.max(y.width,y.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?y.mipmaps.length:1}function w(E){return E===At||E===Zo||E===ta?i.NEAREST:i.LINEAR}function T(E){const y=E.target;y.removeEventListener("dispose",T),S(y),y.isVideoTexture&&h.delete(y)}function D(E){const y=E.target;y.removeEventListener("dispose",D),N(y)}function S(E){const y=n.get(E);if(y.__webglInit===void 0)return;const O=E.source,ne=d.get(O);if(ne){const ee=ne[y.__cacheKey];ee.usedTimes--,ee.usedTimes===0&&A(E),Object.keys(ne).length===0&&d.delete(O)}n.remove(E)}function A(E){const y=n.get(E);i.deleteTexture(y.__webglTexture);const O=E.source,ne=d.get(O);delete ne[y.__cacheKey],a.memory.textures--}function N(E){const y=E.texture,O=n.get(E),ne=n.get(y);if(ne.__webglTexture!==void 0&&(i.deleteTexture(ne.__webglTexture),a.memory.textures--),E.depthTexture&&E.depthTexture.dispose(),E.isWebGLCubeRenderTarget)for(let ee=0;ee<6;ee++){if(Array.isArray(O.__webglFramebuffer[ee]))for(let ie=0;ie<O.__webglFramebuffer[ee].length;ie++)i.deleteFramebuffer(O.__webglFramebuffer[ee][ie]);else i.deleteFramebuffer(O.__webglFramebuffer[ee]);O.__webglDepthbuffer&&i.deleteRenderbuffer(O.__webglDepthbuffer[ee])}else{if(Array.isArray(O.__webglFramebuffer))for(let ee=0;ee<O.__webglFramebuffer.length;ee++)i.deleteFramebuffer(O.__webglFramebuffer[ee]);else i.deleteFramebuffer(O.__webglFramebuffer);if(O.__webglDepthbuffer&&i.deleteRenderbuffer(O.__webglDepthbuffer),O.__webglMultisampledFramebuffer&&i.deleteFramebuffer(O.__webglMultisampledFramebuffer),O.__webglColorRenderbuffer)for(let ee=0;ee<O.__webglColorRenderbuffer.length;ee++)O.__webglColorRenderbuffer[ee]&&i.deleteRenderbuffer(O.__webglColorRenderbuffer[ee]);O.__webglDepthRenderbuffer&&i.deleteRenderbuffer(O.__webglDepthRenderbuffer)}if(E.isWebGLMultipleRenderTargets)for(let ee=0,ie=y.length;ee<ie;ee++){const ve=n.get(y[ee]);ve.__webglTexture&&(i.deleteTexture(ve.__webglTexture),a.memory.textures--),n.remove(y[ee])}n.remove(y),n.remove(E)}let W=0;function Z(){W=0}function I(){const E=W;return E>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+r.maxTextures),W+=1,E}function F(E){const y=[];return y.push(E.wrapS),y.push(E.wrapT),y.push(E.wrapR||0),y.push(E.magFilter),y.push(E.minFilter),y.push(E.anisotropy),y.push(E.internalFormat),y.push(E.format),y.push(E.type),y.push(E.generateMipmaps),y.push(E.premultiplyAlpha),y.push(E.flipY),y.push(E.unpackAlignment),y.push(E.colorSpace),y.join()}function z(E,y){const O=n.get(E);if(E.isVideoTexture&&tt(E),E.isRenderTargetTexture===!1&&E.version>0&&O.__version!==E.version){const ne=E.image;if(ne===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ne.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{le(O,E,y);return}}t.bindTexture(i.TEXTURE_2D,O.__webglTexture,i.TEXTURE0+y)}function $(E,y){const O=n.get(E);if(E.version>0&&O.__version!==E.version){le(O,E,y);return}t.bindTexture(i.TEXTURE_2D_ARRAY,O.__webglTexture,i.TEXTURE0+y)}function X(E,y){const O=n.get(E);if(E.version>0&&O.__version!==E.version){le(O,E,y);return}t.bindTexture(i.TEXTURE_3D,O.__webglTexture,i.TEXTURE0+y)}function Y(E,y){const O=n.get(E);if(E.version>0&&O.__version!==E.version){_e(O,E,y);return}t.bindTexture(i.TEXTURE_CUBE_MAP,O.__webglTexture,i.TEXTURE0+y)}const q={[Tr]:i.REPEAT,[Yt]:i.CLAMP_TO_EDGE,[to]:i.MIRRORED_REPEAT},J={[At]:i.NEAREST,[Zo]:i.NEAREST_MIPMAP_NEAREST,[ta]:i.NEAREST_MIPMAP_LINEAR,[Qt]:i.LINEAR,[hd]:i.LINEAR_MIPMAP_NEAREST,[wr]:i.LINEAR_MIPMAP_LINEAR},oe={[Ad]:i.NEVER,[Ld]:i.ALWAYS,[Td]:i.LESS,[uh]:i.LEQUAL,[wd]:i.EQUAL,[Pd]:i.GEQUAL,[Rd]:i.GREATER,[Cd]:i.NOTEQUAL};function V(E,y,O){if(O?(i.texParameteri(E,i.TEXTURE_WRAP_S,q[y.wrapS]),i.texParameteri(E,i.TEXTURE_WRAP_T,q[y.wrapT]),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,q[y.wrapR]),i.texParameteri(E,i.TEXTURE_MAG_FILTER,J[y.magFilter]),i.texParameteri(E,i.TEXTURE_MIN_FILTER,J[y.minFilter])):(i.texParameteri(E,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(E,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,i.CLAMP_TO_EDGE),(y.wrapS!==Yt||y.wrapT!==Yt)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),i.texParameteri(E,i.TEXTURE_MAG_FILTER,w(y.magFilter)),i.texParameteri(E,i.TEXTURE_MIN_FILTER,w(y.minFilter)),y.minFilter!==At&&y.minFilter!==Qt&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),y.compareFunction&&(i.texParameteri(E,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(E,i.TEXTURE_COMPARE_FUNC,oe[y.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){const ne=e.get("EXT_texture_filter_anisotropic");if(y.magFilter===At||y.minFilter!==ta&&y.minFilter!==wr||y.type===Pn&&e.has("OES_texture_float_linear")===!1||o===!1&&y.type===Rr&&e.has("OES_texture_half_float_linear")===!1)return;(y.anisotropy>1||n.get(y).__currentAnisotropy)&&(i.texParameterf(E,ne.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,r.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy)}}function K(E,y){let O=!1;E.__webglInit===void 0&&(E.__webglInit=!0,y.addEventListener("dispose",T));const ne=y.source;let ee=d.get(ne);ee===void 0&&(ee={},d.set(ne,ee));const ie=F(y);if(ie!==E.__cacheKey){ee[ie]===void 0&&(ee[ie]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,O=!0),ee[ie].usedTimes++;const ve=ee[E.__cacheKey];ve!==void 0&&(ee[E.__cacheKey].usedTimes--,ve.usedTimes===0&&A(y)),E.__cacheKey=ie,E.__webglTexture=ee[ie].texture}return O}function le(E,y,O){let ne=i.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(ne=i.TEXTURE_2D_ARRAY),y.isData3DTexture&&(ne=i.TEXTURE_3D);const ee=K(E,y),ie=y.source;t.bindTexture(ne,E.__webglTexture,i.TEXTURE0+O);const ve=n.get(ie);if(ie.version!==ve.__version||ee===!0){t.activeTexture(i.TEXTURE0+O);const de=et.getPrimaries(et.workingColorSpace),ge=y.colorSpace===tn?null:et.getPrimaries(y.colorSpace),Re=y.colorSpace===tn||de===ge?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Re);const ke=p(y)&&m(y.image)===!1;let Q=x(y.image,ke,!1,r.maxTextureSize);Q=Be(y,Q);const Je=m(Q)||o,Ve=s.convert(y.format,y.colorSpace);let Fe=s.convert(y.type),be=b(y.internalFormat,Ve,Fe,y.colorSpace,y.isVideoTexture);V(ne,y,Je);let fe;const R=y.mipmaps,re=o&&y.isVideoTexture!==!0&&be!==lh,ye=ve.__version===void 0||ee===!0,me=C(y,Q,Je);if(y.isDepthTexture)be=i.DEPTH_COMPONENT,o?y.type===Pn?be=i.DEPTH_COMPONENT32F:y.type===Hn?be=i.DEPTH_COMPONENT24:y.type===pi?be=i.DEPTH24_STENCIL8:be=i.DEPTH_COMPONENT16:y.type===Pn&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),y.format===mi&&be===i.DEPTH_COMPONENT&&y.type!==_o&&y.type!==Hn&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),y.type=Hn,Fe=s.convert(y.type)),y.format===sr&&be===i.DEPTH_COMPONENT&&(be=i.DEPTH_STENCIL,y.type!==pi&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),y.type=pi,Fe=s.convert(y.type))),ye&&(re?t.texStorage2D(i.TEXTURE_2D,1,be,Q.width,Q.height):t.texImage2D(i.TEXTURE_2D,0,be,Q.width,Q.height,0,Ve,Fe,null));else if(y.isDataTexture)if(R.length>0&&Je){re&&ye&&t.texStorage2D(i.TEXTURE_2D,me,be,R[0].width,R[0].height);for(let te=0,L=R.length;te<L;te++)fe=R[te],re?t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe.width,fe.height,Ve,Fe,fe.data):t.texImage2D(i.TEXTURE_2D,te,be,fe.width,fe.height,0,Ve,Fe,fe.data);y.generateMipmaps=!1}else re?(ye&&t.texStorage2D(i.TEXTURE_2D,me,be,Q.width,Q.height),t.texSubImage2D(i.TEXTURE_2D,0,0,0,Q.width,Q.height,Ve,Fe,Q.data)):t.texImage2D(i.TEXTURE_2D,0,be,Q.width,Q.height,0,Ve,Fe,Q.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){re&&ye&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,be,R[0].width,R[0].height,Q.depth);for(let te=0,L=R.length;te<L;te++)fe=R[te],y.format!==en?Ve!==null?re?t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,fe.width,fe.height,Q.depth,Ve,fe.data,0,0):t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,te,be,fe.width,fe.height,Q.depth,0,fe.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):re?t.texSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,fe.width,fe.height,Q.depth,Ve,Fe,fe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,te,be,fe.width,fe.height,Q.depth,0,Ve,Fe,fe.data)}else{re&&ye&&t.texStorage2D(i.TEXTURE_2D,me,be,R[0].width,R[0].height);for(let te=0,L=R.length;te<L;te++)fe=R[te],y.format!==en?Ve!==null?re?t.compressedTexSubImage2D(i.TEXTURE_2D,te,0,0,fe.width,fe.height,Ve,fe.data):t.compressedTexImage2D(i.TEXTURE_2D,te,be,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):re?t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe.width,fe.height,Ve,Fe,fe.data):t.texImage2D(i.TEXTURE_2D,te,be,fe.width,fe.height,0,Ve,Fe,fe.data)}else if(y.isDataArrayTexture)re?(ye&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,be,Q.width,Q.height,Q.depth),t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,Ve,Fe,Q.data)):t.texImage3D(i.TEXTURE_2D_ARRAY,0,be,Q.width,Q.height,Q.depth,0,Ve,Fe,Q.data);else if(y.isData3DTexture)re?(ye&&t.texStorage3D(i.TEXTURE_3D,me,be,Q.width,Q.height,Q.depth),t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,Ve,Fe,Q.data)):t.texImage3D(i.TEXTURE_3D,0,be,Q.width,Q.height,Q.depth,0,Ve,Fe,Q.data);else if(y.isFramebufferTexture){if(ye)if(re)t.texStorage2D(i.TEXTURE_2D,me,be,Q.width,Q.height);else{let te=Q.width,L=Q.height;for(let se=0;se<me;se++)t.texImage2D(i.TEXTURE_2D,se,be,te,L,0,Ve,Fe,null),te>>=1,L>>=1}}else if(R.length>0&&Je){re&&ye&&t.texStorage2D(i.TEXTURE_2D,me,be,R[0].width,R[0].height);for(let te=0,L=R.length;te<L;te++)fe=R[te],re?t.texSubImage2D(i.TEXTURE_2D,te,0,0,Ve,Fe,fe):t.texImage2D(i.TEXTURE_2D,te,be,Ve,Fe,fe);y.generateMipmaps=!1}else re?(ye&&t.texStorage2D(i.TEXTURE_2D,me,be,Q.width,Q.height),t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ve,Fe,Q)):t.texImage2D(i.TEXTURE_2D,0,be,Ve,Fe,Q);v(y,Je)&&_(ne),ve.__version=ie.version,y.onUpdate&&y.onUpdate(y)}E.__version=y.version}function _e(E,y,O){if(y.image.length!==6)return;const ne=K(E,y),ee=y.source;t.bindTexture(i.TEXTURE_CUBE_MAP,E.__webglTexture,i.TEXTURE0+O);const ie=n.get(ee);if(ee.version!==ie.__version||ne===!0){t.activeTexture(i.TEXTURE0+O);const ve=et.getPrimaries(et.workingColorSpace),de=y.colorSpace===tn?null:et.getPrimaries(y.colorSpace),ge=y.colorSpace===tn||ve===de?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ge);const Re=y.isCompressedTexture||y.image[0].isCompressedTexture,ke=y.image[0]&&y.image[0].isDataTexture,Q=[];for(let te=0;te<6;te++)!Re&&!ke?Q[te]=x(y.image[te],!1,!0,r.maxCubemapSize):Q[te]=ke?y.image[te].image:y.image[te],Q[te]=Be(y,Q[te]);const Je=Q[0],Ve=m(Je)||o,Fe=s.convert(y.format,y.colorSpace),be=s.convert(y.type),fe=b(y.internalFormat,Fe,be,y.colorSpace),R=o&&y.isVideoTexture!==!0,re=ie.__version===void 0||ne===!0;let ye=C(y,Je,Ve);V(i.TEXTURE_CUBE_MAP,y,Ve);let me;if(Re){R&&re&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ye,fe,Je.width,Je.height);for(let te=0;te<6;te++){me=Q[te].mipmaps;for(let L=0;L<me.length;L++){const se=me[L];y.format!==en?Fe!==null?R?t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L,0,0,se.width,se.height,Fe,se.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L,fe,se.width,se.height,0,se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):R?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L,0,0,se.width,se.height,Fe,be,se.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L,fe,se.width,se.height,0,Fe,be,se.data)}}}else{me=y.mipmaps,R&&re&&(me.length>0&&ye++,t.texStorage2D(i.TEXTURE_CUBE_MAP,ye,fe,Q[0].width,Q[0].height));for(let te=0;te<6;te++)if(ke){R?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Q[te].width,Q[te].height,Fe,be,Q[te].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,fe,Q[te].width,Q[te].height,0,Fe,be,Q[te].data);for(let L=0;L<me.length;L++){const ue=me[L].image[te].image;R?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L+1,0,0,ue.width,ue.height,Fe,be,ue.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L+1,fe,ue.width,ue.height,0,Fe,be,ue.data)}}else{R?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Fe,be,Q[te]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,fe,Fe,be,Q[te]);for(let L=0;L<me.length;L++){const se=me[L];R?t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L+1,0,0,Fe,be,se.image[te]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,L+1,fe,Fe,be,se.image[te])}}}v(y,Ve)&&_(i.TEXTURE_CUBE_MAP),ie.__version=ee.version,y.onUpdate&&y.onUpdate(y)}E.__version=y.version}function ce(E,y,O,ne,ee,ie){const ve=s.convert(O.format,O.colorSpace),de=s.convert(O.type),ge=b(O.internalFormat,ve,de,O.colorSpace);if(!n.get(y).__hasExternalTextures){const ke=Math.max(1,y.width>>ie),Q=Math.max(1,y.height>>ie);ee===i.TEXTURE_3D||ee===i.TEXTURE_2D_ARRAY?t.texImage3D(ee,ie,ge,ke,Q,y.depth,0,ve,de,null):t.texImage2D(ee,ie,ge,ke,Q,0,ve,de,null)}t.bindFramebuffer(i.FRAMEBUFFER,E),xe(y)?l.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ne,ee,n.get(O).__webglTexture,0,Ue(y)):(ee===i.TEXTURE_2D||ee>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ee<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,ne,ee,n.get(O).__webglTexture,ie),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Me(E,y,O){if(i.bindRenderbuffer(i.RENDERBUFFER,E),y.depthBuffer&&!y.stencilBuffer){let ne=o===!0?i.DEPTH_COMPONENT24:i.DEPTH_COMPONENT16;if(O||xe(y)){const ee=y.depthTexture;ee&&ee.isDepthTexture&&(ee.type===Pn?ne=i.DEPTH_COMPONENT32F:ee.type===Hn&&(ne=i.DEPTH_COMPONENT24));const ie=Ue(y);xe(y)?l.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ie,ne,y.width,y.height):i.renderbufferStorageMultisample(i.RENDERBUFFER,ie,ne,y.width,y.height)}else i.renderbufferStorage(i.RENDERBUFFER,ne,y.width,y.height);i.framebufferRenderbuffer(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.RENDERBUFFER,E)}else if(y.depthBuffer&&y.stencilBuffer){const ne=Ue(y);O&&xe(y)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,ne,i.DEPTH24_STENCIL8,y.width,y.height):xe(y)?l.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ne,i.DEPTH24_STENCIL8,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,i.DEPTH_STENCIL,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.RENDERBUFFER,E)}else{const ne=y.isWebGLMultipleRenderTargets===!0?y.texture:[y.texture];for(let ee=0;ee<ne.length;ee++){const ie=ne[ee],ve=s.convert(ie.format,ie.colorSpace),de=s.convert(ie.type),ge=b(ie.internalFormat,ve,de,ie.colorSpace),Re=Ue(y);O&&xe(y)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Re,ge,y.width,y.height):xe(y)?l.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Re,ge,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,ge,y.width,y.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function De(E,y){if(y&&y.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,E),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(y.depthTexture).__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),z(y.depthTexture,0);const ne=n.get(y.depthTexture).__webglTexture,ee=Ue(y);if(y.depthTexture.format===mi)xe(y)?l.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ne,0,ee):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ne,0);else if(y.depthTexture.format===sr)xe(y)?l.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ne,0,ee):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ne,0);else throw new Error("Unknown depthTexture format")}function we(E){const y=n.get(E),O=E.isWebGLCubeRenderTarget===!0;if(E.depthTexture&&!y.__autoAllocateDepthBuffer){if(O)throw new Error("target.depthTexture not supported in Cube render targets");De(y.__webglFramebuffer,E)}else if(O){y.__webglDepthbuffer=[];for(let ne=0;ne<6;ne++)t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[ne]),y.__webglDepthbuffer[ne]=i.createRenderbuffer(),Me(y.__webglDepthbuffer[ne],E,!1)}else t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer=i.createRenderbuffer(),Me(y.__webglDepthbuffer,E,!1);t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ye(E,y,O){const ne=n.get(E);y!==void 0&&ce(ne.__webglFramebuffer,E,E.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),O!==void 0&&we(E)}function B(E){const y=E.texture,O=n.get(E),ne=n.get(y);E.addEventListener("dispose",D),E.isWebGLMultipleRenderTargets!==!0&&(ne.__webglTexture===void 0&&(ne.__webglTexture=i.createTexture()),ne.__version=y.version,a.memory.textures++);const ee=E.isWebGLCubeRenderTarget===!0,ie=E.isWebGLMultipleRenderTargets===!0,ve=m(E)||o;if(ee){O.__webglFramebuffer=[];for(let de=0;de<6;de++)if(o&&y.mipmaps&&y.mipmaps.length>0){O.__webglFramebuffer[de]=[];for(let ge=0;ge<y.mipmaps.length;ge++)O.__webglFramebuffer[de][ge]=i.createFramebuffer()}else O.__webglFramebuffer[de]=i.createFramebuffer()}else{if(o&&y.mipmaps&&y.mipmaps.length>0){O.__webglFramebuffer=[];for(let de=0;de<y.mipmaps.length;de++)O.__webglFramebuffer[de]=i.createFramebuffer()}else O.__webglFramebuffer=i.createFramebuffer();if(ie)if(r.drawBuffers){const de=E.texture;for(let ge=0,Re=de.length;ge<Re;ge++){const ke=n.get(de[ge]);ke.__webglTexture===void 0&&(ke.__webglTexture=i.createTexture(),a.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(o&&E.samples>0&&xe(E)===!1){const de=ie?y:[y];O.__webglMultisampledFramebuffer=i.createFramebuffer(),O.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let ge=0;ge<de.length;ge++){const Re=de[ge];O.__webglColorRenderbuffer[ge]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,O.__webglColorRenderbuffer[ge]);const ke=s.convert(Re.format,Re.colorSpace),Q=s.convert(Re.type),Je=b(Re.internalFormat,ke,Q,Re.colorSpace,E.isXRRenderTarget===!0),Ve=Ue(E);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ve,Je,E.width,E.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ge,i.RENDERBUFFER,O.__webglColorRenderbuffer[ge])}i.bindRenderbuffer(i.RENDERBUFFER,null),E.depthBuffer&&(O.__webglDepthRenderbuffer=i.createRenderbuffer(),Me(O.__webglDepthRenderbuffer,E,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ee){t.bindTexture(i.TEXTURE_CUBE_MAP,ne.__webglTexture),V(i.TEXTURE_CUBE_MAP,y,ve);for(let de=0;de<6;de++)if(o&&y.mipmaps&&y.mipmaps.length>0)for(let ge=0;ge<y.mipmaps.length;ge++)ce(O.__webglFramebuffer[de][ge],E,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+de,ge);else ce(O.__webglFramebuffer[de],E,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0);v(y,ve)&&_(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ie){const de=E.texture;for(let ge=0,Re=de.length;ge<Re;ge++){const ke=de[ge],Q=n.get(ke);t.bindTexture(i.TEXTURE_2D,Q.__webglTexture),V(i.TEXTURE_2D,ke,ve),ce(O.__webglFramebuffer,E,ke,i.COLOR_ATTACHMENT0+ge,i.TEXTURE_2D,0),v(ke,ve)&&_(i.TEXTURE_2D)}t.unbindTexture()}else{let de=i.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(o?de=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(de,ne.__webglTexture),V(de,y,ve),o&&y.mipmaps&&y.mipmaps.length>0)for(let ge=0;ge<y.mipmaps.length;ge++)ce(O.__webglFramebuffer[ge],E,y,i.COLOR_ATTACHMENT0,de,ge);else ce(O.__webglFramebuffer,E,y,i.COLOR_ATTACHMENT0,de,0);v(y,ve)&&_(de),t.unbindTexture()}E.depthBuffer&&we(E)}function Et(E){const y=m(E)||o,O=E.isWebGLMultipleRenderTargets===!0?E.texture:[E.texture];for(let ne=0,ee=O.length;ne<ee;ne++){const ie=O[ne];if(v(ie,y)){const ve=E.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:i.TEXTURE_2D,de=n.get(ie).__webglTexture;t.bindTexture(ve,de),_(ve),t.unbindTexture()}}}function Ee(E){if(o&&E.samples>0&&xe(E)===!1){const y=E.isWebGLMultipleRenderTargets?E.texture:[E.texture],O=E.width,ne=E.height;let ee=i.COLOR_BUFFER_BIT;const ie=[],ve=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,de=n.get(E),ge=E.isWebGLMultipleRenderTargets===!0;if(ge)for(let Re=0;Re<y.length;Re++)t.bindFramebuffer(i.FRAMEBUFFER,de.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,de.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,de.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,de.__webglFramebuffer);for(let Re=0;Re<y.length;Re++){ie.push(i.COLOR_ATTACHMENT0+Re),E.depthBuffer&&ie.push(ve);const ke=de.__ignoreDepthValues!==void 0?de.__ignoreDepthValues:!1;if(ke===!1&&(E.depthBuffer&&(ee|=i.DEPTH_BUFFER_BIT),E.stencilBuffer&&(ee|=i.STENCIL_BUFFER_BIT)),ge&&i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,de.__webglColorRenderbuffer[Re]),ke===!0&&(i.invalidateFramebuffer(i.READ_FRAMEBUFFER,[ve]),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[ve])),ge){const Q=n.get(y[Re]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Q,0)}i.blitFramebuffer(0,0,O,ne,0,0,O,ne,ee,i.NEAREST),c&&i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ie)}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ge)for(let Re=0;Re<y.length;Re++){t.bindFramebuffer(i.FRAMEBUFFER,de.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,de.__webglColorRenderbuffer[Re]);const ke=n.get(y[Re]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,de.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,ke,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,de.__webglMultisampledFramebuffer)}}function Ue(E){return Math.min(r.maxSamples,E.samples)}function xe(E){const y=n.get(E);return o&&E.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function tt(E){const y=a.render.frame;h.get(E)!==y&&(h.set(E,y),E.update())}function Be(E,y){const O=E.colorSpace,ne=E.format,ee=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||E.format===no||O!==In&&O!==tn&&(et.getTransfer(O)===nt?o===!1?e.has("EXT_sRGB")===!0&&ne===en?(E.format=no,E.minFilter=Qt,E.generateMipmaps=!1):y=fh.sRGBToLinear(y):(ne!==en||ee!==Yn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",O)),y}this.allocateTextureUnit=I,this.resetTextureUnits=Z,this.setTexture2D=z,this.setTexture2DArray=$,this.setTexture3D=X,this.setTextureCube=Y,this.rebindTextures=Ye,this.setupRenderTarget=B,this.updateRenderTargetMipmap=Et,this.updateMultisampleRenderTarget=Ee,this.setupDepthRenderbuffer=we,this.setupFrameBufferTexture=ce,this.useMultisampledRTT=xe}function j_(i,e,t){const n=t.isWebGL2;function r(s,a=tn){let o;const l=et.getTransfer(a);if(s===Yn)return i.UNSIGNED_BYTE;if(s===ih)return i.UNSIGNED_SHORT_4_4_4_4;if(s===rh)return i.UNSIGNED_SHORT_5_5_5_1;if(s===ud)return i.BYTE;if(s===dd)return i.SHORT;if(s===_o)return i.UNSIGNED_SHORT;if(s===nh)return i.INT;if(s===Hn)return i.UNSIGNED_INT;if(s===Pn)return i.FLOAT;if(s===Rr)return n?i.HALF_FLOAT:(o=e.get("OES_texture_half_float"),o!==null?o.HALF_FLOAT_OES:null);if(s===fd)return i.ALPHA;if(s===en)return i.RGBA;if(s===pd)return i.LUMINANCE;if(s===md)return i.LUMINANCE_ALPHA;if(s===mi)return i.DEPTH_COMPONENT;if(s===sr)return i.DEPTH_STENCIL;if(s===no)return o=e.get("EXT_sRGB"),o!==null?o.SRGB_ALPHA_EXT:null;if(s===gd)return i.RED;if(s===sh)return i.RED_INTEGER;if(s===_d)return i.RG;if(s===ah)return i.RG_INTEGER;if(s===oh)return i.RGBA_INTEGER;if(s===na||s===ia||s===ra||s===sa)if(l===nt)if(o=e.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(s===na)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===ia)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===ra)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===sa)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=e.get("WEBGL_compressed_texture_s3tc"),o!==null){if(s===na)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===ia)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===ra)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===sa)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===Jo||s===Qo||s===el||s===tl)if(o=e.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(s===Jo)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===Qo)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===el)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===tl)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===lh)return o=e.get("WEBGL_compressed_texture_etc1"),o!==null?o.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===nl||s===il)if(o=e.get("WEBGL_compressed_texture_etc"),o!==null){if(s===nl)return l===nt?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(s===il)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===rl||s===sl||s===al||s===ol||s===ll||s===cl||s===hl||s===ul||s===dl||s===fl||s===pl||s===ml||s===gl||s===_l)if(o=e.get("WEBGL_compressed_texture_astc"),o!==null){if(s===rl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===sl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===al)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===ol)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===ll)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===cl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===hl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===ul)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===dl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===fl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===pl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===ml)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===gl)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===_l)return l===nt?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===aa||s===xl||s===vl)if(o=e.get("EXT_texture_compression_bptc"),o!==null){if(s===aa)return l===nt?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===xl)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===vl)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===xd||s===yl||s===Sl||s===bl)if(o=e.get("EXT_texture_compression_rgtc"),o!==null){if(s===aa)return o.COMPRESSED_RED_RGTC1_EXT;if(s===yl)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===Sl)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===bl)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===pi?n?i.UNSIGNED_INT_24_8:(o=e.get("WEBGL_depth_texture"),o!==null?o.UNSIGNED_INT_24_8_WEBGL:null):i[s]!==void 0?i[s]:null}return{convert:r}}class Y_ extends Ot{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class di extends rt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const $_={type:"move"};class Pa{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new di,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new di,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new di,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const x of e.hand.values()){const m=t.getJointPose(x,n),p=this._getHandJoint(c,x);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent($_)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new di;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class q_ extends Qn{constructor(e,t){super();const n=this;let r=null,s=1,a=null,o="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,g=null;const x=t.getContextAttributes();let m=null,p=null;const v=[],_=[],b=new Le;let C=null;const w=new Ot;w.layers.enable(1),w.viewport=new Qe;const T=new Ot;T.layers.enable(2),T.viewport=new Qe;const D=[w,T],S=new Y_;S.layers.enable(1),S.layers.enable(2);let A=null,N=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(V){let K=v[V];return K===void 0&&(K=new Pa,v[V]=K),K.getTargetRaySpace()},this.getControllerGrip=function(V){let K=v[V];return K===void 0&&(K=new Pa,v[V]=K),K.getGripSpace()},this.getHand=function(V){let K=v[V];return K===void 0&&(K=new Pa,v[V]=K),K.getHandSpace()};function W(V){const K=_.indexOf(V.inputSource);if(K===-1)return;const le=v[K];le!==void 0&&(le.update(V.inputSource,V.frame,c||a),le.dispatchEvent({type:V.type,data:V.inputSource}))}function Z(){r.removeEventListener("select",W),r.removeEventListener("selectstart",W),r.removeEventListener("selectend",W),r.removeEventListener("squeeze",W),r.removeEventListener("squeezestart",W),r.removeEventListener("squeezeend",W),r.removeEventListener("end",Z),r.removeEventListener("inputsourceschange",I);for(let V=0;V<v.length;V++){const K=_[V];K!==null&&(_[V]=null,v[V].disconnect(K))}A=null,N=null,e.setRenderTarget(m),f=null,d=null,u=null,r=null,p=null,oe.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(b.width,b.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(V){s=V,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(V){o=V,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(V){c=V},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(V){if(r=V,r!==null){if(m=e.getRenderTarget(),r.addEventListener("select",W),r.addEventListener("selectstart",W),r.addEventListener("selectend",W),r.addEventListener("squeeze",W),r.addEventListener("squeezestart",W),r.addEventListener("squeezeend",W),r.addEventListener("end",Z),r.addEventListener("inputsourceschange",I),x.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(b),r.renderState.layers===void 0||e.capabilities.isWebGL2===!1){const K={antialias:r.renderState.layers===void 0?x.antialias:!0,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,t,K),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),p=new xi(f.framebufferWidth,f.framebufferHeight,{format:en,type:Yn,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil})}else{let K=null,le=null,_e=null;x.depth&&(_e=x.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,K=x.stencil?sr:mi,le=x.stencil?pi:Hn);const ce={colorFormat:t.RGBA8,depthFormat:_e,scaleFactor:s};u=new XRWebGLBinding(r,t),d=u.createProjectionLayer(ce),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),p=new xi(d.textureWidth,d.textureHeight,{format:en,type:Yn,depthTexture:new Mh(d.textureWidth,d.textureHeight,le,void 0,void 0,void 0,void 0,void 0,void 0,K),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0});const Me=e.properties.get(p);Me.__ignoreDepthValues=d.ignoreDepthValues}p.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),oe.setContext(r),oe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function I(V){for(let K=0;K<V.removed.length;K++){const le=V.removed[K],_e=_.indexOf(le);_e>=0&&(_[_e]=null,v[_e].disconnect(le))}for(let K=0;K<V.added.length;K++){const le=V.added[K];let _e=_.indexOf(le);if(_e===-1){for(let Me=0;Me<v.length;Me++)if(Me>=_.length){_.push(le),_e=Me;break}else if(_[Me]===null){_[Me]=le,_e=Me;break}if(_e===-1)break}const ce=v[_e];ce&&ce.connect(le)}}const F=new P,z=new P;function $(V,K,le){F.setFromMatrixPosition(K.matrixWorld),z.setFromMatrixPosition(le.matrixWorld);const _e=F.distanceTo(z),ce=K.projectionMatrix.elements,Me=le.projectionMatrix.elements,De=ce[14]/(ce[10]-1),we=ce[14]/(ce[10]+1),Ye=(ce[9]+1)/ce[5],B=(ce[9]-1)/ce[5],Et=(ce[8]-1)/ce[0],Ee=(Me[8]+1)/Me[0],Ue=De*Et,xe=De*Ee,tt=_e/(-Et+Ee),Be=tt*-Et;K.matrixWorld.decompose(V.position,V.quaternion,V.scale),V.translateX(Be),V.translateZ(tt),V.matrixWorld.compose(V.position,V.quaternion,V.scale),V.matrixWorldInverse.copy(V.matrixWorld).invert();const E=De+tt,y=we+tt,O=Ue-Be,ne=xe+(_e-Be),ee=Ye*we/y*E,ie=B*we/y*E;V.projectionMatrix.makePerspective(O,ne,ee,ie,E,y),V.projectionMatrixInverse.copy(V.projectionMatrix).invert()}function X(V,K){K===null?V.matrixWorld.copy(V.matrix):V.matrixWorld.multiplyMatrices(K.matrixWorld,V.matrix),V.matrixWorldInverse.copy(V.matrixWorld).invert()}this.updateCamera=function(V){if(r===null)return;S.near=T.near=w.near=V.near,S.far=T.far=w.far=V.far,(A!==S.near||N!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),A=S.near,N=S.far);const K=V.parent,le=S.cameras;X(S,K);for(let _e=0;_e<le.length;_e++)X(le[_e],K);le.length===2?$(S,w,T):S.projectionMatrix.copy(w.projectionMatrix),Y(V,S,K)};function Y(V,K,le){le===null?V.matrix.copy(K.matrixWorld):(V.matrix.copy(le.matrixWorld),V.matrix.invert(),V.matrix.multiply(K.matrixWorld)),V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld(!0),V.projectionMatrix.copy(K.projectionMatrix),V.projectionMatrixInverse.copy(K.projectionMatrixInverse),V.isPerspectiveCamera&&(V.fov=ar*2*Math.atan(1/V.projectionMatrix.elements[5]),V.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(V){l=V,d!==null&&(d.fixedFoveation=V),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=V)};let q=null;function J(V,K){if(h=K.getViewerPose(c||a),g=K,h!==null){const le=h.views;f!==null&&(e.setRenderTargetFramebuffer(p,f.framebuffer),e.setRenderTarget(p));let _e=!1;le.length!==S.cameras.length&&(S.cameras.length=0,_e=!0);for(let ce=0;ce<le.length;ce++){const Me=le[ce];let De=null;if(f!==null)De=f.getViewport(Me);else{const Ye=u.getViewSubImage(d,Me);De=Ye.viewport,ce===0&&(e.setRenderTargetTextures(p,Ye.colorTexture,d.ignoreDepthValues?void 0:Ye.depthStencilTexture),e.setRenderTarget(p))}let we=D[ce];we===void 0&&(we=new Ot,we.layers.enable(ce),we.viewport=new Qe,D[ce]=we),we.matrix.fromArray(Me.transform.matrix),we.matrix.decompose(we.position,we.quaternion,we.scale),we.projectionMatrix.fromArray(Me.projectionMatrix),we.projectionMatrixInverse.copy(we.projectionMatrix).invert(),we.viewport.set(De.x,De.y,De.width,De.height),ce===0&&(S.matrix.copy(we.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),_e===!0&&S.cameras.push(we)}}for(let le=0;le<v.length;le++){const _e=_[le],ce=v[le];_e!==null&&ce!==void 0&&ce.update(_e,K,c||a)}q&&q(V,K),K.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:K}),g=null}const oe=new bh;oe.setAnimationLoop(J),this.setAnimationLoop=function(V){q=V},this.dispose=function(){}}}function K_(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,vh(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,v,_,b){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),u(m,p)):p.isMeshPhongMaterial?(s(m,p),h(m,p)):p.isMeshStandardMaterial?(s(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,b)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),x(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,v,_):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Vt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Vt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const v=e.get(p).envMap;if(v&&(m.envMap.value=v,m.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap){m.lightMap.value=p.lightMap;const _=i._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=p.lightMapIntensity*_,t(p.lightMap,m.lightMapTransform)}p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,v,_){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*v,m.scale.value=_*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),e.get(p).envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,v){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Vt&&m.clearcoatNormalScale.value.negate())),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=v.texture,m.transmissionSamplerSize.value.set(v.width,v.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function x(m,p){const v=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(v.matrixWorld),m.nearDistance.value=v.shadow.camera.near,m.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Z_(i,e,t,n){let r={},s={},a=[];const o=t.isWebGL2?i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS):0;function l(v,_){const b=_.program;n.uniformBlockBinding(v,b)}function c(v,_){let b=r[v.id];b===void 0&&(g(v),b=h(v),r[v.id]=b,v.addEventListener("dispose",m));const C=_.program;n.updateUBOMapping(v,C);const w=e.render.frame;s[v.id]!==w&&(d(v),s[v.id]=w)}function h(v){const _=u();v.__bindingPointIndex=_;const b=i.createBuffer(),C=v.__size,w=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,b),i.bufferData(i.UNIFORM_BUFFER,C,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,_,b),b}function u(){for(let v=0;v<o;v++)if(a.indexOf(v)===-1)return a.push(v),v;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(v){const _=r[v.id],b=v.uniforms,C=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,_);for(let w=0,T=b.length;w<T;w++){const D=Array.isArray(b[w])?b[w]:[b[w]];for(let S=0,A=D.length;S<A;S++){const N=D[S];if(f(N,w,S,C)===!0){const W=N.__offset,Z=Array.isArray(N.value)?N.value:[N.value];let I=0;for(let F=0;F<Z.length;F++){const z=Z[F],$=x(z);typeof z=="number"||typeof z=="boolean"?(N.__data[0]=z,i.bufferSubData(i.UNIFORM_BUFFER,W+I,N.__data)):z.isMatrix3?(N.__data[0]=z.elements[0],N.__data[1]=z.elements[1],N.__data[2]=z.elements[2],N.__data[3]=0,N.__data[4]=z.elements[3],N.__data[5]=z.elements[4],N.__data[6]=z.elements[5],N.__data[7]=0,N.__data[8]=z.elements[6],N.__data[9]=z.elements[7],N.__data[10]=z.elements[8],N.__data[11]=0):(z.toArray(N.__data,I),I+=$.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,W,N.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(v,_,b,C){const w=v.value,T=_+"_"+b;if(C[T]===void 0)return typeof w=="number"||typeof w=="boolean"?C[T]=w:C[T]=w.clone(),!0;{const D=C[T];if(typeof w=="number"||typeof w=="boolean"){if(D!==w)return C[T]=w,!0}else if(D.equals(w)===!1)return D.copy(w),!0}return!1}function g(v){const _=v.uniforms;let b=0;const C=16;for(let T=0,D=_.length;T<D;T++){const S=Array.isArray(_[T])?_[T]:[_[T]];for(let A=0,N=S.length;A<N;A++){const W=S[A],Z=Array.isArray(W.value)?W.value:[W.value];for(let I=0,F=Z.length;I<F;I++){const z=Z[I],$=x(z),X=b%C;X!==0&&C-X<$.boundary&&(b+=C-X),W.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),W.__offset=b,b+=$.storage}}}const w=b%C;return w>0&&(b+=C-w),v.__size=b,v.__cache={},this}function x(v){const _={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(_.boundary=4,_.storage=4):v.isVector2?(_.boundary=8,_.storage=8):v.isVector3||v.isColor?(_.boundary=16,_.storage=12):v.isVector4?(_.boundary=16,_.storage=16):v.isMatrix3?(_.boundary=48,_.storage=48):v.isMatrix4?(_.boundary=64,_.storage=64):v.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",v),_}function m(v){const _=v.target;_.removeEventListener("dispose",m);const b=a.indexOf(_.__bindingPointIndex);a.splice(b,1),i.deleteBuffer(r[_.id]),delete r[_.id],delete s[_.id]}function p(){for(const v in r)i.deleteBuffer(r[v]);a=[],r={},s={}}return{bind:l,update:c,dispose:p}}class Ch{constructor(e={}){const{canvas:t=jd(),context:n=null,depth:r=!0,stencil:s=!0,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1}=e;this.isWebGLRenderer=!0;let d;n!==null?d=n.getContextAttributes().alpha:d=a;const f=new Uint32Array(4),g=new Int32Array(4);let x=null,m=null;const p=[],v=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=ft,this._useLegacyLights=!1,this.toneMapping=jn,this.toneMappingExposure=1;const _=this;let b=!1,C=0,w=0,T=null,D=-1,S=null;const A=new Qe,N=new Qe;let W=null;const Z=new Ie(0);let I=0,F=t.width,z=t.height,$=1,X=null,Y=null;const q=new Qe(0,0,F,z),J=new Qe(0,0,F,z);let oe=!1;const V=new Mo;let K=!1,le=!1,_e=null;const ce=new Te,Me=new Le,De=new P,we={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ye(){return T===null?$:1}let B=n;function Et(M,U){for(let G=0;G<M.length;G++){const H=M[G],k=t.getContext(H,U);if(k!==null)return k}return null}try{const M={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${go}`),t.addEventListener("webglcontextlost",te,!1),t.addEventListener("webglcontextrestored",L,!1),t.addEventListener("webglcontextcreationerror",se,!1),B===null){const U=["webgl2","webgl","experimental-webgl"];if(_.isWebGL1Renderer===!0&&U.shift(),B=Et(U,M),B===null)throw Et(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&B instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),B.getShaderPrecisionFormat===void 0&&(B.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let Ee,Ue,xe,tt,Be,E,y,O,ne,ee,ie,ve,de,ge,Re,ke,Q,Je,Ve,Fe,be,fe,R,re;function ye(){Ee=new og(B),Ue=new tg(B,Ee,e),Ee.init(Ue),fe=new j_(B,Ee,Ue),xe=new W_(B,Ee,Ue),tt=new hg(B),Be=new P_,E=new X_(B,Ee,xe,Be,Ue,fe,tt),y=new ig(_),O=new ag(_),ne=new xf(B,Ue),R=new Qm(B,Ee,ne,Ue),ee=new lg(B,ne,tt,R),ie=new pg(B,ee,ne,tt),Ve=new fg(B,Ue,E),ke=new ng(Be),ve=new C_(_,y,O,Ee,Ue,R,ke),de=new K_(_,Be),ge=new I_,Re=new B_(Ee,Ue),Je=new Jm(_,y,O,xe,ie,d,l),Q=new H_(_,ie,Ue),re=new Z_(B,tt,Ue,xe),Fe=new eg(B,Ee,tt,Ue),be=new cg(B,Ee,tt,Ue),tt.programs=ve.programs,_.capabilities=Ue,_.extensions=Ee,_.properties=Be,_.renderLists=ge,_.shadowMap=Q,_.state=xe,_.info=tt}ye();const me=new q_(_,B);this.xr=me,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){const M=Ee.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=Ee.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(M){M!==void 0&&($=M,this.setSize(F,z,!1))},this.getSize=function(M){return M.set(F,z)},this.setSize=function(M,U,G=!0){if(me.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=M,z=U,t.width=Math.floor(M*$),t.height=Math.floor(U*$),G===!0&&(t.style.width=M+"px",t.style.height=U+"px"),this.setViewport(0,0,M,U)},this.getDrawingBufferSize=function(M){return M.set(F*$,z*$).floor()},this.setDrawingBufferSize=function(M,U,G){F=M,z=U,$=G,t.width=Math.floor(M*G),t.height=Math.floor(U*G),this.setViewport(0,0,M,U)},this.getCurrentViewport=function(M){return M.copy(A)},this.getViewport=function(M){return M.copy(q)},this.setViewport=function(M,U,G,H){M.isVector4?q.set(M.x,M.y,M.z,M.w):q.set(M,U,G,H),xe.viewport(A.copy(q).multiplyScalar($).floor())},this.getScissor=function(M){return M.copy(J)},this.setScissor=function(M,U,G,H){M.isVector4?J.set(M.x,M.y,M.z,M.w):J.set(M,U,G,H),xe.scissor(N.copy(J).multiplyScalar($).floor())},this.getScissorTest=function(){return oe},this.setScissorTest=function(M){xe.setScissorTest(oe=M)},this.setOpaqueSort=function(M){X=M},this.setTransparentSort=function(M){Y=M},this.getClearColor=function(M){return M.copy(Je.getClearColor())},this.setClearColor=function(){Je.setClearColor.apply(Je,arguments)},this.getClearAlpha=function(){return Je.getClearAlpha()},this.setClearAlpha=function(){Je.setClearAlpha.apply(Je,arguments)},this.clear=function(M=!0,U=!0,G=!0){let H=0;if(M){let k=!1;if(T!==null){const pe=T.texture.format;k=pe===oh||pe===ah||pe===sh}if(k){const pe=T.texture.type,Se=pe===Yn||pe===Hn||pe===_o||pe===pi||pe===ih||pe===rh,Pe=Je.getClearColor(),Ne=Je.getClearAlpha(),He=Pe.r,Oe=Pe.g,ze=Pe.b;Se?(f[0]=He,f[1]=Oe,f[2]=ze,f[3]=Ne,B.clearBufferuiv(B.COLOR,0,f)):(g[0]=He,g[1]=Oe,g[2]=ze,g[3]=Ne,B.clearBufferiv(B.COLOR,0,g))}else H|=B.COLOR_BUFFER_BIT}U&&(H|=B.DEPTH_BUFFER_BIT),G&&(H|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",te,!1),t.removeEventListener("webglcontextrestored",L,!1),t.removeEventListener("webglcontextcreationerror",se,!1),ge.dispose(),Re.dispose(),Be.dispose(),y.dispose(),O.dispose(),ie.dispose(),R.dispose(),re.dispose(),ve.dispose(),me.dispose(),me.removeEventListener("sessionstart",ht),me.removeEventListener("sessionend",Ze),_e&&(_e.dispose(),_e=null),pt.stop()};function te(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function L(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const M=tt.autoReset,U=Q.enabled,G=Q.autoUpdate,H=Q.needsUpdate,k=Q.type;ye(),tt.autoReset=M,Q.enabled=U,Q.autoUpdate=G,Q.needsUpdate=H,Q.type=k}function se(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function ue(M){const U=M.target;U.removeEventListener("dispose",ue),Ce(U)}function Ce(M){Ae(M),Be.remove(M)}function Ae(M){const U=Be.get(M).programs;U!==void 0&&(U.forEach(function(G){ve.releaseProgram(G)}),M.isShaderMaterial&&ve.releaseShaderCache(M))}this.renderBufferDirect=function(M,U,G,H,k,pe){U===null&&(U=we);const Se=k.isMesh&&k.matrixWorld.determinant()<0,Pe=Mu(M,U,G,H,k);xe.setMaterial(H,Se);let Ne=G.index,He=1;if(H.wireframe===!0){if(Ne=ee.getWireframeAttribute(G),Ne===void 0)return;He=2}const Oe=G.drawRange,ze=G.attributes.position;let ut=Oe.start*He,Wt=(Oe.start+Oe.count)*He;pe!==null&&(ut=Math.max(ut,pe.start*He),Wt=Math.min(Wt,(pe.start+pe.count)*He)),Ne!==null?(ut=Math.max(ut,0),Wt=Math.min(Wt,Ne.count)):ze!=null&&(ut=Math.max(ut,0),Wt=Math.min(Wt,ze.count));const vt=Wt-ut;if(vt<0||vt===1/0)return;R.setup(k,H,Pe,G,Ne);let vn,st=Fe;if(Ne!==null&&(vn=ne.get(Ne),st=be,st.setIndex(vn)),k.isMesh)H.wireframe===!0?(xe.setLineWidth(H.wireframeLinewidth*Ye()),st.setMode(B.LINES)):st.setMode(B.TRIANGLES);else if(k.isLine){let je=H.linewidth;je===void 0&&(je=1),xe.setLineWidth(je*Ye()),k.isLineSegments?st.setMode(B.LINES):k.isLineLoop?st.setMode(B.LINE_LOOP):st.setMode(B.LINE_STRIP)}else k.isPoints?st.setMode(B.POINTS):k.isSprite&&st.setMode(B.TRIANGLES);if(k.isBatchedMesh)st.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else if(k.isInstancedMesh)st.renderInstances(ut,vt,k.count);else if(G.isInstancedBufferGeometry){const je=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,Zs=Math.min(G.instanceCount,je);st.renderInstances(ut,vt,Zs)}else st.render(ut,vt)};function $e(M,U,G){M.transparent===!0&&M.side===pn&&M.forceSinglePass===!1?(M.side=Vt,M.needsUpdate=!0,Vr(M,U,G),M.side=Kn,M.needsUpdate=!0,Vr(M,U,G),M.side=pn):Vr(M,U,G)}this.compile=function(M,U,G=null){G===null&&(G=M),m=Re.get(G),m.init(),v.push(m),G.traverseVisible(function(k){k.isLight&&k.layers.test(U.layers)&&(m.pushLight(k),k.castShadow&&m.pushShadow(k))}),M!==G&&M.traverseVisible(function(k){k.isLight&&k.layers.test(U.layers)&&(m.pushLight(k),k.castShadow&&m.pushShadow(k))}),m.setupLights(_._useLegacyLights);const H=new Set;return M.traverse(function(k){const pe=k.material;if(pe)if(Array.isArray(pe))for(let Se=0;Se<pe.length;Se++){const Pe=pe[Se];$e(Pe,G,k),H.add(Pe)}else $e(pe,G,k),H.add(pe)}),v.pop(),m=null,H},this.compileAsync=function(M,U,G=null){const H=this.compile(M,U,G);return new Promise(k=>{function pe(){if(H.forEach(function(Se){Be.get(Se).currentProgram.isReady()&&H.delete(Se)}),H.size===0){k(M);return}setTimeout(pe,10)}Ee.get("KHR_parallel_shader_compile")!==null?pe():setTimeout(pe,10)})};let qe=null;function ot(M){qe&&qe(M)}function ht(){pt.stop()}function Ze(){pt.start()}const pt=new bh;pt.setAnimationLoop(ot),typeof self<"u"&&pt.setContext(self),this.setAnimationLoop=function(M){qe=M,me.setAnimationLoop(M),M===null?pt.stop():pt.start()},me.addEventListener("sessionstart",ht),me.addEventListener("sessionend",Ze),this.render=function(M,U){if(U!==void 0&&U.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),me.enabled===!0&&me.isPresenting===!0&&(me.cameraAutoUpdate===!0&&me.updateCamera(U),U=me.getCamera()),M.isScene===!0&&M.onBeforeRender(_,M,U,T),m=Re.get(M,v.length),m.init(),v.push(m),ce.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),V.setFromProjectionMatrix(ce),le=this.localClippingEnabled,K=ke.init(this.clippingPlanes,le),x=ge.get(M,p.length),x.init(),p.push(x),hn(M,U,0,_.sortObjects),x.finish(),_.sortObjects===!0&&x.sort(X,Y),this.info.render.frame++,K===!0&&ke.beginShadows();const G=m.state.shadowsArray;if(Q.render(G,M,U),K===!0&&ke.endShadows(),this.info.autoReset===!0&&this.info.reset(),Je.render(x,M),m.setupLights(_._useLegacyLights),U.isArrayCamera){const H=U.cameras;for(let k=0,pe=H.length;k<pe;k++){const Se=H[k];Bo(x,M,Se,Se.viewport)}}else Bo(x,M,U);T!==null&&(E.updateMultisampleRenderTarget(T),E.updateRenderTargetMipmap(T)),M.isScene===!0&&M.onAfterRender(_,M,U),R.resetDefaultState(),D=-1,S=null,v.pop(),v.length>0?m=v[v.length-1]:m=null,p.pop(),p.length>0?x=p[p.length-1]:x=null};function hn(M,U,G,H){if(M.visible===!1)return;if(M.layers.test(U.layers)){if(M.isGroup)G=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(U);else if(M.isLight)m.pushLight(M),M.castShadow&&m.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||V.intersectsSprite(M)){H&&De.setFromMatrixPosition(M.matrixWorld).applyMatrix4(ce);const Se=ie.update(M),Pe=M.material;Pe.visible&&x.push(M,Se,Pe,G,De.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||V.intersectsObject(M))){const Se=ie.update(M),Pe=M.material;if(H&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),De.copy(M.boundingSphere.center)):(Se.boundingSphere===null&&Se.computeBoundingSphere(),De.copy(Se.boundingSphere.center)),De.applyMatrix4(M.matrixWorld).applyMatrix4(ce)),Array.isArray(Pe)){const Ne=Se.groups;for(let He=0,Oe=Ne.length;He<Oe;He++){const ze=Ne[He],ut=Pe[ze.materialIndex];ut&&ut.visible&&x.push(M,Se,ut,G,De.z,ze)}}else Pe.visible&&x.push(M,Se,Pe,G,De.z,null)}}const pe=M.children;for(let Se=0,Pe=pe.length;Se<Pe;Se++)hn(pe[Se],U,G,H)}function Bo(M,U,G,H){const k=M.opaque,pe=M.transmissive,Se=M.transparent;m.setupLightsView(G),K===!0&&ke.setGlobalState(_.clippingPlanes,G),pe.length>0&&bu(k,pe,U,G),H&&xe.viewport(A.copy(H)),k.length>0&&Gr(k,U,G),pe.length>0&&Gr(pe,U,G),Se.length>0&&Gr(Se,U,G),xe.buffers.depth.setTest(!0),xe.buffers.depth.setMask(!0),xe.buffers.color.setMask(!0),xe.setPolygonOffset(!1)}function bu(M,U,G,H){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;const pe=Ue.isWebGL2;_e===null&&(_e=new xi(1,1,{generateMipmaps:!0,type:Ee.has("EXT_color_buffer_half_float")?Rr:Yn,minFilter:wr,samples:pe?4:0})),_.getDrawingBufferSize(Me),pe?_e.setSize(Me.x,Me.y):_e.setSize(Is(Me.x),Is(Me.y));const Se=_.getRenderTarget();_.setRenderTarget(_e),_.getClearColor(Z),I=_.getClearAlpha(),I<1&&_.setClearColor(16777215,.5),_.clear();const Pe=_.toneMapping;_.toneMapping=jn,Gr(M,G,H),E.updateMultisampleRenderTarget(_e),E.updateRenderTargetMipmap(_e);let Ne=!1;for(let He=0,Oe=U.length;He<Oe;He++){const ze=U[He],ut=ze.object,Wt=ze.geometry,vt=ze.material,vn=ze.group;if(vt.side===pn&&ut.layers.test(H.layers)){const st=vt.side;vt.side=Vt,vt.needsUpdate=!0,ko(ut,G,H,Wt,vt,vn),vt.side=st,vt.needsUpdate=!0,Ne=!0}}Ne===!0&&(E.updateMultisampleRenderTarget(_e),E.updateRenderTargetMipmap(_e)),_.setRenderTarget(Se),_.setClearColor(Z,I),_.toneMapping=Pe}function Gr(M,U,G){const H=U.isScene===!0?U.overrideMaterial:null;for(let k=0,pe=M.length;k<pe;k++){const Se=M[k],Pe=Se.object,Ne=Se.geometry,He=H===null?Se.material:H,Oe=Se.group;Pe.layers.test(G.layers)&&ko(Pe,U,G,Ne,He,Oe)}}function ko(M,U,G,H,k,pe){M.onBeforeRender(_,U,G,H,k,pe),M.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),k.onBeforeRender(_,U,G,H,M,pe),k.transparent===!0&&k.side===pn&&k.forceSinglePass===!1?(k.side=Vt,k.needsUpdate=!0,_.renderBufferDirect(G,U,H,k,M,pe),k.side=Kn,k.needsUpdate=!0,_.renderBufferDirect(G,U,H,k,M,pe),k.side=pn):_.renderBufferDirect(G,U,H,k,M,pe),M.onAfterRender(_,U,G,H,k,pe)}function Vr(M,U,G){U.isScene!==!0&&(U=we);const H=Be.get(M),k=m.state.lights,pe=m.state.shadowsArray,Se=k.state.version,Pe=ve.getParameters(M,k.state,pe,U,G),Ne=ve.getProgramCacheKey(Pe);let He=H.programs;H.environment=M.isMeshStandardMaterial?U.environment:null,H.fog=U.fog,H.envMap=(M.isMeshStandardMaterial?O:y).get(M.envMap||H.environment),He===void 0&&(M.addEventListener("dispose",ue),He=new Map,H.programs=He);let Oe=He.get(Ne);if(Oe!==void 0){if(H.currentProgram===Oe&&H.lightsStateVersion===Se)return Go(M,Pe),Oe}else Pe.uniforms=ve.getUniforms(M),M.onBuild(G,Pe,_),M.onBeforeCompile(Pe,_),Oe=ve.acquireProgram(Pe,Ne),He.set(Ne,Oe),H.uniforms=Pe.uniforms;const ze=H.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(ze.clippingPlanes=ke.uniform),Go(M,Pe),H.needsLights=Au(M),H.lightsStateVersion=Se,H.needsLights&&(ze.ambientLightColor.value=k.state.ambient,ze.lightProbe.value=k.state.probe,ze.directionalLights.value=k.state.directional,ze.directionalLightShadows.value=k.state.directionalShadow,ze.spotLights.value=k.state.spot,ze.spotLightShadows.value=k.state.spotShadow,ze.rectAreaLights.value=k.state.rectArea,ze.ltc_1.value=k.state.rectAreaLTC1,ze.ltc_2.value=k.state.rectAreaLTC2,ze.pointLights.value=k.state.point,ze.pointLightShadows.value=k.state.pointShadow,ze.hemisphereLights.value=k.state.hemi,ze.directionalShadowMap.value=k.state.directionalShadowMap,ze.directionalShadowMatrix.value=k.state.directionalShadowMatrix,ze.spotShadowMap.value=k.state.spotShadowMap,ze.spotLightMatrix.value=k.state.spotLightMatrix,ze.spotLightMap.value=k.state.spotLightMap,ze.pointShadowMap.value=k.state.pointShadowMap,ze.pointShadowMatrix.value=k.state.pointShadowMatrix),H.currentProgram=Oe,H.uniformsList=null,Oe}function zo(M){if(M.uniformsList===null){const U=M.currentProgram.getUniforms();M.uniformsList=ys.seqWithValue(U.seq,M.uniforms)}return M.uniformsList}function Go(M,U){const G=Be.get(M);G.outputColorSpace=U.outputColorSpace,G.batching=U.batching,G.instancing=U.instancing,G.instancingColor=U.instancingColor,G.skinning=U.skinning,G.morphTargets=U.morphTargets,G.morphNormals=U.morphNormals,G.morphColors=U.morphColors,G.morphTargetsCount=U.morphTargetsCount,G.numClippingPlanes=U.numClippingPlanes,G.numIntersection=U.numClipIntersection,G.vertexAlphas=U.vertexAlphas,G.vertexTangents=U.vertexTangents,G.toneMapping=U.toneMapping}function Mu(M,U,G,H,k){U.isScene!==!0&&(U=we),E.resetTextureUnits();const pe=U.fog,Se=H.isMeshStandardMaterial?U.environment:null,Pe=T===null?_.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:In,Ne=(H.isMeshStandardMaterial?O:y).get(H.envMap||Se),He=H.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Oe=!!G.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),ze=!!G.morphAttributes.position,ut=!!G.morphAttributes.normal,Wt=!!G.morphAttributes.color;let vt=jn;H.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(vt=_.toneMapping);const vn=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,st=vn!==void 0?vn.length:0,je=Be.get(H),Zs=m.state.lights;if(K===!0&&(le===!0||M!==S)){const qt=M===S&&H.id===D;ke.setState(H,M,qt)}let lt=!1;H.version===je.__version?(je.needsLights&&je.lightsStateVersion!==Zs.state.version||je.outputColorSpace!==Pe||k.isBatchedMesh&&je.batching===!1||!k.isBatchedMesh&&je.batching===!0||k.isInstancedMesh&&je.instancing===!1||!k.isInstancedMesh&&je.instancing===!0||k.isSkinnedMesh&&je.skinning===!1||!k.isSkinnedMesh&&je.skinning===!0||k.isInstancedMesh&&je.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&je.instancingColor===!1&&k.instanceColor!==null||je.envMap!==Ne||H.fog===!0&&je.fog!==pe||je.numClippingPlanes!==void 0&&(je.numClippingPlanes!==ke.numPlanes||je.numIntersection!==ke.numIntersection)||je.vertexAlphas!==He||je.vertexTangents!==Oe||je.morphTargets!==ze||je.morphNormals!==ut||je.morphColors!==Wt||je.toneMapping!==vt||Ue.isWebGL2===!0&&je.morphTargetsCount!==st)&&(lt=!0):(lt=!0,je.__version=H.version);let ii=je.currentProgram;lt===!0&&(ii=Vr(H,U,k));let Vo=!1,fr=!1,Js=!1;const Tt=ii.getUniforms(),ri=je.uniforms;if(xe.useProgram(ii.program)&&(Vo=!0,fr=!0,Js=!0),H.id!==D&&(D=H.id,fr=!0),Vo||S!==M){Tt.setValue(B,"projectionMatrix",M.projectionMatrix),Tt.setValue(B,"viewMatrix",M.matrixWorldInverse);const qt=Tt.map.cameraPosition;qt!==void 0&&qt.setValue(B,De.setFromMatrixPosition(M.matrixWorld)),Ue.logarithmicDepthBuffer&&Tt.setValue(B,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&Tt.setValue(B,"isOrthographic",M.isOrthographicCamera===!0),S!==M&&(S=M,fr=!0,Js=!0)}if(k.isSkinnedMesh){Tt.setOptional(B,k,"bindMatrix"),Tt.setOptional(B,k,"bindMatrixInverse");const qt=k.skeleton;qt&&(Ue.floatVertexTextures?(qt.boneTexture===null&&qt.computeBoneTexture(),Tt.setValue(B,"boneTexture",qt.boneTexture,E)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}k.isBatchedMesh&&(Tt.setOptional(B,k,"batchingTexture"),Tt.setValue(B,"batchingTexture",k._matricesTexture,E));const Qs=G.morphAttributes;if((Qs.position!==void 0||Qs.normal!==void 0||Qs.color!==void 0&&Ue.isWebGL2===!0)&&Ve.update(k,G,ii),(fr||je.receiveShadow!==k.receiveShadow)&&(je.receiveShadow=k.receiveShadow,Tt.setValue(B,"receiveShadow",k.receiveShadow)),H.isMeshGouraudMaterial&&H.envMap!==null&&(ri.envMap.value=Ne,ri.flipEnvMap.value=Ne.isCubeTexture&&Ne.isRenderTargetTexture===!1?-1:1),fr&&(Tt.setValue(B,"toneMappingExposure",_.toneMappingExposure),je.needsLights&&Eu(ri,Js),pe&&H.fog===!0&&de.refreshFogUniforms(ri,pe),de.refreshMaterialUniforms(ri,H,$,z,_e),ys.upload(B,zo(je),ri,E)),H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(ys.upload(B,zo(je),ri,E),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&Tt.setValue(B,"center",k.center),Tt.setValue(B,"modelViewMatrix",k.modelViewMatrix),Tt.setValue(B,"normalMatrix",k.normalMatrix),Tt.setValue(B,"modelMatrix",k.matrixWorld),H.isShaderMaterial||H.isRawShaderMaterial){const qt=H.uniformsGroups;for(let ea=0,Tu=qt.length;ea<Tu;ea++)if(Ue.isWebGL2){const Ho=qt[ea];re.update(Ho,ii),re.bind(Ho,ii)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return ii}function Eu(M,U){M.ambientLightColor.needsUpdate=U,M.lightProbe.needsUpdate=U,M.directionalLights.needsUpdate=U,M.directionalLightShadows.needsUpdate=U,M.pointLights.needsUpdate=U,M.pointLightShadows.needsUpdate=U,M.spotLights.needsUpdate=U,M.spotLightShadows.needsUpdate=U,M.rectAreaLights.needsUpdate=U,M.hemisphereLights.needsUpdate=U}function Au(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(M,U,G){Be.get(M.texture).__webglTexture=U,Be.get(M.depthTexture).__webglTexture=G;const H=Be.get(M);H.__hasExternalTextures=!0,H.__hasExternalTextures&&(H.__autoAllocateDepthBuffer=G===void 0,H.__autoAllocateDepthBuffer||Ee.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),H.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(M,U){const G=Be.get(M);G.__webglFramebuffer=U,G.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(M,U=0,G=0){T=M,C=U,w=G;let H=!0,k=null,pe=!1,Se=!1;if(M){const Ne=Be.get(M);Ne.__useDefaultFramebuffer!==void 0?(xe.bindFramebuffer(B.FRAMEBUFFER,null),H=!1):Ne.__webglFramebuffer===void 0?E.setupRenderTarget(M):Ne.__hasExternalTextures&&E.rebindTextures(M,Be.get(M.texture).__webglTexture,Be.get(M.depthTexture).__webglTexture);const He=M.texture;(He.isData3DTexture||He.isDataArrayTexture||He.isCompressedArrayTexture)&&(Se=!0);const Oe=Be.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Oe[U])?k=Oe[U][G]:k=Oe[U],pe=!0):Ue.isWebGL2&&M.samples>0&&E.useMultisampledRTT(M)===!1?k=Be.get(M).__webglMultisampledFramebuffer:Array.isArray(Oe)?k=Oe[G]:k=Oe,A.copy(M.viewport),N.copy(M.scissor),W=M.scissorTest}else A.copy(q).multiplyScalar($).floor(),N.copy(J).multiplyScalar($).floor(),W=oe;if(xe.bindFramebuffer(B.FRAMEBUFFER,k)&&Ue.drawBuffers&&H&&xe.drawBuffers(M,k),xe.viewport(A),xe.scissor(N),xe.setScissorTest(W),pe){const Ne=Be.get(M.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+U,Ne.__webglTexture,G)}else if(Se){const Ne=Be.get(M.texture),He=U||0;B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,Ne.__webglTexture,G||0,He)}D=-1},this.readRenderTargetPixels=function(M,U,G,H,k,pe,Se){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Pe=Be.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&Se!==void 0&&(Pe=Pe[Se]),Pe){xe.bindFramebuffer(B.FRAMEBUFFER,Pe);try{const Ne=M.texture,He=Ne.format,Oe=Ne.type;if(He!==en&&fe.convert(He)!==B.getParameter(B.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const ze=Oe===Rr&&(Ee.has("EXT_color_buffer_half_float")||Ue.isWebGL2&&Ee.has("EXT_color_buffer_float"));if(Oe!==Yn&&fe.convert(Oe)!==B.getParameter(B.IMPLEMENTATION_COLOR_READ_TYPE)&&!(Oe===Pn&&(Ue.isWebGL2||Ee.has("OES_texture_float")||Ee.has("WEBGL_color_buffer_float")))&&!ze){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=M.width-H&&G>=0&&G<=M.height-k&&B.readPixels(U,G,H,k,fe.convert(He),fe.convert(Oe),pe)}finally{const Ne=T!==null?Be.get(T).__webglFramebuffer:null;xe.bindFramebuffer(B.FRAMEBUFFER,Ne)}}},this.copyFramebufferToTexture=function(M,U,G=0){const H=Math.pow(2,-G),k=Math.floor(U.image.width*H),pe=Math.floor(U.image.height*H);E.setTexture2D(U,0),B.copyTexSubImage2D(B.TEXTURE_2D,G,0,0,M.x,M.y,k,pe),xe.unbindTexture()},this.copyTextureToTexture=function(M,U,G,H=0){const k=U.image.width,pe=U.image.height,Se=fe.convert(G.format),Pe=fe.convert(G.type);E.setTexture2D(G,0),B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,G.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,G.unpackAlignment),U.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,H,M.x,M.y,k,pe,Se,Pe,U.image.data):U.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,H,M.x,M.y,U.mipmaps[0].width,U.mipmaps[0].height,Se,U.mipmaps[0].data):B.texSubImage2D(B.TEXTURE_2D,H,M.x,M.y,Se,Pe,U.image),H===0&&G.generateMipmaps&&B.generateMipmap(B.TEXTURE_2D),xe.unbindTexture()},this.copyTextureToTexture3D=function(M,U,G,H,k=0){if(_.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const pe=M.max.x-M.min.x+1,Se=M.max.y-M.min.y+1,Pe=M.max.z-M.min.z+1,Ne=fe.convert(H.format),He=fe.convert(H.type);let Oe;if(H.isData3DTexture)E.setTexture3D(H,0),Oe=B.TEXTURE_3D;else if(H.isDataArrayTexture||H.isCompressedArrayTexture)E.setTexture2DArray(H,0),Oe=B.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,H.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,H.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,H.unpackAlignment);const ze=B.getParameter(B.UNPACK_ROW_LENGTH),ut=B.getParameter(B.UNPACK_IMAGE_HEIGHT),Wt=B.getParameter(B.UNPACK_SKIP_PIXELS),vt=B.getParameter(B.UNPACK_SKIP_ROWS),vn=B.getParameter(B.UNPACK_SKIP_IMAGES),st=G.isCompressedTexture?G.mipmaps[k]:G.image;B.pixelStorei(B.UNPACK_ROW_LENGTH,st.width),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,st.height),B.pixelStorei(B.UNPACK_SKIP_PIXELS,M.min.x),B.pixelStorei(B.UNPACK_SKIP_ROWS,M.min.y),B.pixelStorei(B.UNPACK_SKIP_IMAGES,M.min.z),G.isDataTexture||G.isData3DTexture?B.texSubImage3D(Oe,k,U.x,U.y,U.z,pe,Se,Pe,Ne,He,st.data):G.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),B.compressedTexSubImage3D(Oe,k,U.x,U.y,U.z,pe,Se,Pe,Ne,st.data)):B.texSubImage3D(Oe,k,U.x,U.y,U.z,pe,Se,Pe,Ne,He,st),B.pixelStorei(B.UNPACK_ROW_LENGTH,ze),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,ut),B.pixelStorei(B.UNPACK_SKIP_PIXELS,Wt),B.pixelStorei(B.UNPACK_SKIP_ROWS,vt),B.pixelStorei(B.UNPACK_SKIP_IMAGES,vn),k===0&&H.generateMipmaps&&B.generateMipmap(Oe),xe.unbindTexture()},this.initTexture=function(M){M.isCubeTexture?E.setTextureCube(M,0):M.isData3DTexture?E.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?E.setTexture2DArray(M,0):E.setTexture2D(M,0),xe.unbindTexture()},this.resetState=function(){C=0,w=0,T=null,xe.reset(),R.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ln}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===yo?"display-p3":"srgb",t.unpackColorSpace=et.workingColorSpace===Ws?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===ft?gi:hh}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===gi?ft:In}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}}class J_ extends Ch{}J_.prototype.isWebGL1Renderer=!0;class Q_ extends rt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}}const uc=new P,dc=new Qe,fc=new Qe,ex=new P,pc=new Te,us=new P,La=new cr,mc=new Te,Ia=new Xs;class tx extends kt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Ko,this.bindMatrix=new Te,this.bindMatrixInverse=new Te,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Mi),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,us),this.boundingBox.expandByPoint(us)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new cr),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,us),this.boundingSphere.expandByPoint(us)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),La.copy(this.boundingSphere),La.applyMatrix4(r),e.ray.intersectsSphere(La)!==!1&&(mc.copy(r).invert(),Ia.copy(e.ray).applyMatrix4(mc),!(this.boundingBox!==null&&Ia.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Ia)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new Qe,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);const s=1/e.manhattanLength();s!==1/0?e.multiplyScalar(s):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Ko?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===cd?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,r=this.geometry;dc.fromBufferAttribute(r.attributes.skinIndex,e),fc.fromBufferAttribute(r.attributes.skinWeight,e),uc.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let s=0;s<4;s++){const a=fc.getComponent(s);if(a!==0){const o=dc.getComponent(s);pc.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(ex.copy(uc).applyMatrix4(pc),a)}}return t.applyMatrix4(this.bindMatrixInverse)}boneTransform(e,t){return console.warn("THREE.SkinnedMesh: .boneTransform() was renamed to .applyBoneTransform() in r151."),this.applyBoneTransform(e,t)}}class so extends rt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class nx extends Mt{constructor(e=null,t=1,n=1,r,s,a,o,l,c=At,h=At,u,d){super(null,a,o,l,c,h,r,s,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const gc=new Te,ix=new Te;class wo{constructor(e=[],t=[]){this.uuid=ei(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,r=this.bones.length;n<r;n++)this.boneInverses.push(new Te)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Te;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let s=0,a=e.length;s<a;s++){const o=e[s]?e[s].matrixWorld:ix;gc.multiplyMatrices(o,t[s]),gc.toArray(n,s*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new wo(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new nx(t,e,e,en,Pn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const r=this.bones[t];if(r.name===e)return r}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){const s=e.bones[n];let a=t[s];a===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",s),a=new so),this.bones.push(a),this.boneInverses.push(new Te().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.6,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let r=0,s=t.length;r<s;r++){const a=t[r];e.bones.push(a.uuid);const o=n[r];e.boneInverses.push(o.toArray())}return e}}class Or extends Ei{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ie(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const _c=new P,xc=new P,vc=new Te,Da=new Xs,ds=new cr;class Ro extends rt{constructor(e=new It,t=new Or){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let r=1,s=t.count;r<s;r++)_c.fromBufferAttribute(t,r-1),xc.fromBufferAttribute(t,r),n[r]=n[r-1],n[r]+=_c.distanceTo(xc);e.setAttribute("lineDistance",new ct(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ds.copy(n.boundingSphere),ds.applyMatrix4(r),ds.radius+=s,e.ray.intersectsSphere(ds)===!1)return;vc.copy(r).invert(),Da.copy(e.ray).applyMatrix4(vc);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=new P,h=new P,u=new P,d=new P,f=this.isLineSegments?2:1,g=n.index,m=n.attributes.position;if(g!==null){const p=Math.max(0,a.start),v=Math.min(g.count,a.start+a.count);for(let _=p,b=v-1;_<b;_+=f){const C=g.getX(_),w=g.getX(_+1);if(c.fromBufferAttribute(m,C),h.fromBufferAttribute(m,w),Da.distanceSqToSegment(c,h,d,u)>l)continue;d.applyMatrix4(this.matrixWorld);const D=e.ray.origin.distanceTo(d);D<e.near||D>e.far||t.push({distance:D,point:u.clone().applyMatrix4(this.matrixWorld),index:_,face:null,faceIndex:null,object:this})}}else{const p=Math.max(0,a.start),v=Math.min(m.count,a.start+a.count);for(let _=p,b=v-1;_<b;_+=f){if(c.fromBufferAttribute(m,_),h.fromBufferAttribute(m,_+1),Da.distanceSqToSegment(c,h,d,u)>l)continue;d.applyMatrix4(this.matrixWorld);const w=e.ray.origin.distanceTo(d);w<e.near||w>e.far||t.push({distance:w,point:u.clone().applyMatrix4(this.matrixWorld),index:_,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}const yc=new P,Sc=new P;class Ph extends Ro{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let r=0,s=t.count;r<s;r+=2)yc.fromBufferAttribute(t,r),Sc.fromBufferAttribute(t,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+yc.distanceTo(Sc);e.setAttribute("lineDistance",new ct(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class rx{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,r=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(r),t.push(s),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){const n=this.getLengths();let r=0;const s=n.length;let a;t?a=t:a=e*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(r=Math.floor(o+(l-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)l=r-1;else{l=r;break}if(r=l,n[r]===a)return r/(s-1);const h=n[r],d=n[r+1]-h,f=(a-h)/d;return(r+f)/(s-1)}getTangent(e,t){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);const a=this.getPoint(r),o=this.getPoint(s),l=t||(a.isVector2?new Le:new P);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){const n=new P,r=[],s=[],a=[],o=new P,l=new Te;for(let f=0;f<=e;f++){const g=f/e;r[f]=this.getTangentAt(g,new P)}s[0]=new P,a[0]=new P;let c=Number.MAX_VALUE;const h=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(r[f-1],r[f]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(St(r[f-1].dot(r[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(o,g))}a[f].crossVectors(r[f],s[f])}if(t===!0){let f=Math.acos(St(s[0].dot(s[e]),-1,1));f/=e,r[0].dot(o.crossVectors(s[0],s[e]))>0&&(f=-f);for(let g=1;g<=e;g++)s[g].applyMatrix4(l.makeRotationAxis(r[g],f*g)),a[g].crossVectors(r[g],s[g])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class Co extends It{constructor(e=1,t=1,n=1,r=32,s=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const h=[],u=[],d=[],f=[];let g=0;const x=[],m=n/2;let p=0;v(),a===!1&&(e>0&&_(!0),t>0&&_(!1)),this.setIndex(h),this.setAttribute("position",new ct(u,3)),this.setAttribute("normal",new ct(d,3)),this.setAttribute("uv",new ct(f,2));function v(){const b=new P,C=new P;let w=0;const T=(t-e)/n;for(let D=0;D<=s;D++){const S=[],A=D/s,N=A*(t-e)+e;for(let W=0;W<=r;W++){const Z=W/r,I=Z*l+o,F=Math.sin(I),z=Math.cos(I);C.x=N*F,C.y=-A*n+m,C.z=N*z,u.push(C.x,C.y,C.z),b.set(F,T,z).normalize(),d.push(b.x,b.y,b.z),f.push(Z,1-A),S.push(g++)}x.push(S)}for(let D=0;D<r;D++)for(let S=0;S<s;S++){const A=x[S][D],N=x[S+1][D],W=x[S+1][D+1],Z=x[S][D+1];h.push(A,N,Z),h.push(N,W,Z),w+=6}c.addGroup(p,w,0),p+=w}function _(b){const C=g,w=new Le,T=new P;let D=0;const S=b===!0?e:t,A=b===!0?1:-1;for(let W=1;W<=r;W++)u.push(0,m*A,0),d.push(0,A,0),f.push(.5,.5),g++;const N=g;for(let W=0;W<=r;W++){const I=W/r*l+o,F=Math.cos(I),z=Math.sin(I);T.x=S*z,T.y=m*A,T.z=S*F,u.push(T.x,T.y,T.z),d.push(0,A,0),w.x=F*.5+.5,w.y=z*.5*A+.5,f.push(w.x,w.y),g++}for(let W=0;W<r;W++){const Z=C+W,I=N+W;b===!0?h.push(I,I+1,Z):h.push(I+1,I,Z),D+=3}c.addGroup(p,D,b===!0?1:2),p+=D}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Co(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}const sx={triangulate:function(i,e,t=2){const n=e&&e.length,r=n?e[0]*t:i.length;let s=Lh(i,0,r,t,!0);const a=[];if(!s||s.next===s.prev)return a;let o,l,c,h,u,d,f;if(n&&(s=hx(i,e,s,t)),i.length>80*t){o=c=i[0],l=h=i[1];for(let g=t;g<r;g+=t)u=i[g],d=i[g+1],u<o&&(o=u),d<l&&(l=d),u>c&&(c=u),d>h&&(h=d);f=Math.max(c-o,h-l),f=f!==0?32767/f:0}return Pr(s,a,t,o,l,f,0),a}};function Lh(i,e,t,n,r){let s,a;if(r===Sx(i,e,t,n)>0)for(s=e;s<t;s+=n)a=bc(s,i[s],i[s+1],a);else for(s=t-n;s>=e;s-=n)a=bc(s,i[s],i[s+1],a);return a&&Ys(a,a.next)&&(Ir(a),a=a.next),a}function yi(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Ys(t,t.next)||at(t.prev,t,t.next)===0)){if(Ir(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Pr(i,e,t,n,r,s,a){if(!i)return;!a&&s&&mx(i,n,r,s);let o=i,l,c;for(;i.prev!==i.next;){if(l=i.prev,c=i.next,s?ox(i,n,r,s):ax(i)){e.push(l.i/t|0),e.push(i.i/t|0),e.push(c.i/t|0),Ir(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=lx(yi(i),e,t),Pr(i,e,t,n,r,s,2)):a===2&&cx(i,e,t,n,r,s):Pr(yi(i),e,t,n,r,s,1);break}}}function ax(i){const e=i.prev,t=i,n=i.next;if(at(e,t,n)>=0)return!1;const r=e.x,s=t.x,a=n.x,o=e.y,l=t.y,c=n.y,h=r<s?r<a?r:a:s<a?s:a,u=o<l?o<c?o:c:l<c?l:c,d=r>s?r>a?r:a:s>a?s:a,f=o>l?o>c?o:c:l>c?l:c;let g=n.next;for(;g!==e;){if(g.x>=h&&g.x<=d&&g.y>=u&&g.y<=f&&Zi(r,o,s,l,a,c,g.x,g.y)&&at(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function ox(i,e,t,n){const r=i.prev,s=i,a=i.next;if(at(r,s,a)>=0)return!1;const o=r.x,l=s.x,c=a.x,h=r.y,u=s.y,d=a.y,f=o<l?o<c?o:c:l<c?l:c,g=h<u?h<d?h:d:u<d?u:d,x=o>l?o>c?o:c:l>c?l:c,m=h>u?h>d?h:d:u>d?u:d,p=ao(f,g,e,t,n),v=ao(x,m,e,t,n);let _=i.prevZ,b=i.nextZ;for(;_&&_.z>=p&&b&&b.z<=v;){if(_.x>=f&&_.x<=x&&_.y>=g&&_.y<=m&&_!==r&&_!==a&&Zi(o,h,l,u,c,d,_.x,_.y)&&at(_.prev,_,_.next)>=0||(_=_.prevZ,b.x>=f&&b.x<=x&&b.y>=g&&b.y<=m&&b!==r&&b!==a&&Zi(o,h,l,u,c,d,b.x,b.y)&&at(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;_&&_.z>=p;){if(_.x>=f&&_.x<=x&&_.y>=g&&_.y<=m&&_!==r&&_!==a&&Zi(o,h,l,u,c,d,_.x,_.y)&&at(_.prev,_,_.next)>=0)return!1;_=_.prevZ}for(;b&&b.z<=v;){if(b.x>=f&&b.x<=x&&b.y>=g&&b.y<=m&&b!==r&&b!==a&&Zi(o,h,l,u,c,d,b.x,b.y)&&at(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function lx(i,e,t){let n=i;do{const r=n.prev,s=n.next.next;!Ys(r,s)&&Ih(r,n,n.next,s)&&Lr(r,s)&&Lr(s,r)&&(e.push(r.i/t|0),e.push(n.i/t|0),e.push(s.i/t|0),Ir(n),Ir(n.next),n=i=s),n=n.next}while(n!==i);return yi(n)}function cx(i,e,t,n,r,s){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&xx(a,o)){let l=Dh(a,o);a=yi(a,a.next),l=yi(l,l.next),Pr(a,e,t,n,r,s,0),Pr(l,e,t,n,r,s,0);return}o=o.next}a=a.next}while(a!==i)}function hx(i,e,t,n){const r=[];let s,a,o,l,c;for(s=0,a=e.length;s<a;s++)o=e[s]*n,l=s<a-1?e[s+1]*n:i.length,c=Lh(i,o,l,n,!1),c===c.next&&(c.steiner=!0),r.push(_x(c));for(r.sort(ux),s=0;s<r.length;s++)t=dx(r[s],t);return t}function ux(i,e){return i.x-e.x}function dx(i,e){const t=fx(i,e);if(!t)return e;const n=Dh(t,i);return yi(n,n.next),yi(t,t.next)}function fx(i,e){let t=e,n=-1/0,r;const s=i.x,a=i.y;do{if(a<=t.y&&a>=t.next.y&&t.next.y!==t.y){const d=t.x+(a-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=s&&d>n&&(n=d,r=t.x<t.next.x?t:t.next,d===s))return r}t=t.next}while(t!==e);if(!r)return null;const o=r,l=r.x,c=r.y;let h=1/0,u;t=r;do s>=t.x&&t.x>=l&&s!==t.x&&Zi(a<c?s:n,a,l,c,a<c?n:s,a,t.x,t.y)&&(u=Math.abs(a-t.y)/(s-t.x),Lr(t,i)&&(u<h||u===h&&(t.x>r.x||t.x===r.x&&px(r,t)))&&(r=t,h=u)),t=t.next;while(t!==o);return r}function px(i,e){return at(i.prev,i,e.prev)<0&&at(e.next,i,i.next)<0}function mx(i,e,t,n){let r=i;do r.z===0&&(r.z=ao(r.x,r.y,e,t,n)),r.prevZ=r.prev,r.nextZ=r.next,r=r.next;while(r!==i);r.prevZ.nextZ=null,r.prevZ=null,gx(r)}function gx(i){let e,t,n,r,s,a,o,l,c=1;do{for(t=i,i=null,s=null,a=0;t;){for(a++,n=t,o=0,e=0;e<c&&(o++,n=n.nextZ,!!n);e++);for(l=c;o>0||l>0&&n;)o!==0&&(l===0||!n||t.z<=n.z)?(r=t,t=t.nextZ,o--):(r=n,n=n.nextZ,l--),s?s.nextZ=r:i=r,r.prevZ=s,s=r;t=n}s.nextZ=null,c*=2}while(a>1);return i}function ao(i,e,t,n,r){return i=(i-t)*r|0,e=(e-n)*r|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function _x(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Zi(i,e,t,n,r,s,a,o){return(r-a)*(e-o)>=(i-a)*(s-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(r-a)*(n-o)}function xx(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!vx(i,e)&&(Lr(i,e)&&Lr(e,i)&&yx(i,e)&&(at(i.prev,i,e.prev)||at(i,e.prev,e))||Ys(i,e)&&at(i.prev,i,i.next)>0&&at(e.prev,e,e.next)>0)}function at(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Ys(i,e){return i.x===e.x&&i.y===e.y}function Ih(i,e,t,n){const r=ps(at(i,e,t)),s=ps(at(i,e,n)),a=ps(at(t,n,i)),o=ps(at(t,n,e));return!!(r!==s&&a!==o||r===0&&fs(i,t,e)||s===0&&fs(i,n,e)||a===0&&fs(t,i,n)||o===0&&fs(t,e,n))}function fs(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function ps(i){return i>0?1:i<0?-1:0}function vx(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Ih(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function Lr(i,e){return at(i.prev,i,i.next)<0?at(i,e,i.next)>=0&&at(i,i.prev,e)>=0:at(i,e,i.prev)<0||at(i,i.next,e)<0}function yx(i,e){let t=i,n=!1;const r=(i.x+e.x)/2,s=(i.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&r<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Dh(i,e){const t=new oo(i.i,i.x,i.y),n=new oo(e.i,e.x,e.y),r=i.next,s=e.prev;return i.next=e,e.prev=i,t.next=r,r.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function bc(i,e,t,n){const r=new oo(i,e,t);return n?(r.next=n.next,r.prev=n,n.next.prev=r,n.next=r):(r.prev=r,r.next=r),r}function Ir(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function oo(i,e,t){this.i=i,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function Sx(i,e,t,n){let r=0;for(let s=e,a=t-n;s<t;s+=n)r+=(i[a]-i[s])*(i[s+1]+i[a+1]),a=s;return r}class Po{static area(e){const t=e.length;let n=0;for(let r=t-1,s=0;s<t;r=s++)n+=e[r].x*e[s].y-e[s].x*e[r].y;return n*.5}static isClockWise(e){return Po.area(e)<0}static triangulateShape(e,t){const n=[],r=[],s=[];Mc(e),Ec(n,e);let a=e.length;t.forEach(Mc);for(let l=0;l<t.length;l++)r.push(a),a+=t[l].length,Ec(n,t[l]);const o=sx.triangulate(n,r);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}}function Mc(i){const e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Ec(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}class $s extends It{constructor(e=1,t=32,n=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],u=new P,d=new P,f=[],g=[],x=[],m=[];for(let p=0;p<=n;p++){const v=[],_=p/n;let b=0;p===0&&a===0?b=.5/t:p===n&&l===Math.PI&&(b=-.5/t);for(let C=0;C<=t;C++){const w=C/t;u.x=-e*Math.cos(r+w*s)*Math.sin(a+_*o),u.y=e*Math.cos(a+_*o),u.z=e*Math.sin(r+w*s)*Math.sin(a+_*o),g.push(u.x,u.y,u.z),d.copy(u).normalize(),x.push(d.x,d.y,d.z),m.push(w+b,1-_),v.push(c++)}h.push(v)}for(let p=0;p<n;p++)for(let v=0;v<t;v++){const _=h[p][v+1],b=h[p][v],C=h[p+1][v],w=h[p+1][v+1];(p!==0||a>0)&&f.push(_,b,w),(p!==n-1||l<Math.PI)&&f.push(b,C,w)}this.setIndex(f),this.setAttribute("position",new ct(g,3)),this.setAttribute("normal",new ct(x,3)),this.setAttribute("uv",new ct(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new $s(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Ua extends Ei{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new Ie(16777215),this.specular=new Ie(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ie(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=vo,this.normalScale=new Le(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Vs,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class bx extends Ei{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ie(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ie(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=vo,this.normalScale=new Le(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Vs,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}function ms(i,e,t){return!i||!t&&i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function Mx(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Ex(i){function e(r,s){return i[r]-i[s]}const t=i.length,n=new Array(t);for(let r=0;r!==t;++r)n[r]=r;return n.sort(e),n}function Ac(i,e,t){const n=i.length,r=new i.constructor(n);for(let s=0,a=0;a!==n;++s){const o=t[s]*e;for(let l=0;l!==e;++l)r[a++]=i[o+l]}return r}function Uh(i,e,t,n){let r=1,s=i[0];for(;s!==void 0&&s[n]===void 0;)s=i[r++];if(s===void 0)return;let a=s[n];if(a!==void 0)if(Array.isArray(a))do a=s[n],a!==void 0&&(e.push(s.time),t.push.apply(t,a)),s=i[r++];while(s!==void 0);else if(a.toArray!==void 0)do a=s[n],a!==void 0&&(e.push(s.time),a.toArray(t,t.length)),s=i[r++];while(s!==void 0);else do a=s[n],a!==void 0&&(e.push(s.time),t.push(a)),s=i[r++];while(s!==void 0)}class qs{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,r=t[n],s=t[n-1];e:{t:{let a;n:{i:if(!(e<r)){for(let o=n+2;;){if(r===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=r,r=t[++n],e<r)break t}a=t.length;break n}if(!(e>=s)){const o=t[1];e<o&&(n=2,s=o);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(r=s,s=t[--n-1],e>=s)break t}a=n,n=0;break n}break e}for(;n<a;){const o=n+a>>>1;e<t[o]?a=o:n=o+1}if(r=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,r)}return this.interpolate_(n,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=e*r;for(let a=0;a!==r;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}class Ax extends qs{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Yi,endingEnd:Yi}}intervalChanged_(e,t,n){const r=this.parameterPositions;let s=e-2,a=e+1,o=r[s],l=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case $i:s=e,o=2*t-n;break;case Ts:s=r.length-2,o=t+r[s]-r[s+1];break;default:s=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case $i:a=e,l=2*n-t;break;case Ts:a=1,l=n+r[1]-r[0];break;default:a=e-1,l=t}const c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=s*h,this._offsetNext=a*h}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(r-t),x=g*g,m=x*g,p=-d*m+2*d*x-d*g,v=(1+d)*m+(-1.5-2*d)*x+(-.5+d)*g+1,_=(-1-f)*m+(1.5+f)*x+.5*g,b=f*m-f*x;for(let C=0;C!==o;++C)s[C]=p*a[h+C]+v*a[c+C]+_*a[l+C]+b*a[u+C];return s}}class Fh extends qs{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(n-t)/(r-t),u=1-h;for(let d=0;d!==o;++d)s[d]=a[c+d]*u+a[l+d]*h;return s}}class Tx extends qs{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}}class xn{constructor(e,t,n,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ms(t,this.TimeBufferType),this.values=ms(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ms(e.times,Array),values:ms(e.values,Array)};const r=e.getInterpolation();r!==e.DefaultInterpolation&&(n.interpolation=r)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Tx(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Fh(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Ax(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case Es:t=this.InterpolantFactoryMethodDiscrete;break;case As:t=this.InterpolantFactoryMethodLinear;break;case oa:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Es;case this.InterpolantFactoryMethodLinear:return As;case this.InterpolantFactoryMethodSmooth:return oa}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){const n=this.times,r=n.length;let s=0,a=r-1;for(;s!==r&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==r){s>=a&&(a=Math.max(a,1),s=a-1);const o=this.getValueSize();this.times=n.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,r=this.values,s=n.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){const l=n[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(r!==void 0&&Mx(r))for(let o=0,l=r.length;o!==l;++o){const c=r[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===oa,s=e.length-1;let a=1;for(let o=1;o<s;++o){let l=!1;const c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(r)l=!0;else{const u=o*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){const x=t[u+g];if(x!==t[d+g]||x!==t[f+g]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];const u=o*n,d=a*n;for(let f=0;f!==n;++f)t[d+f]=t[u+f]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,l=a*n,c=0;c!==n;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}}xn.prototype.TimeBufferType=Float32Array;xn.prototype.ValueBufferType=Float32Array;xn.prototype.DefaultInterpolation=As;class ur extends xn{}ur.prototype.ValueTypeName="bool";ur.prototype.ValueBufferType=Array;ur.prototype.DefaultInterpolation=Es;ur.prototype.InterpolantFactoryMethodLinear=void 0;ur.prototype.InterpolantFactoryMethodSmooth=void 0;class Nh extends xn{}Nh.prototype.ValueTypeName="color";class Dr extends xn{}Dr.prototype.ValueTypeName="number";class wx extends qs{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-t)/(r-t);let c=e*o;for(let h=c+o;c!==h;c+=4)gt.slerpFlat(s,0,a,c-o,a,c,l);return s}}class Si extends xn{InterpolantFactoryMethodLinear(e){return new wx(this.times,this.values,this.getValueSize(),e)}}Si.prototype.ValueTypeName="quaternion";Si.prototype.DefaultInterpolation=As;Si.prototype.InterpolantFactoryMethodSmooth=void 0;class dr extends xn{}dr.prototype.ValueTypeName="string";dr.prototype.ValueBufferType=Array;dr.prototype.DefaultInterpolation=Es;dr.prototype.InterpolantFactoryMethodLinear=void 0;dr.prototype.InterpolantFactoryMethodSmooth=void 0;class Ur extends xn{}Ur.prototype.ValueTypeName="vector";class lo{constructor(e,t=-1,n,r=xo){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=ei(),this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,r=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(Cx(n[a]).scale(r));const s=new this(e.name,e.duration,t,e.blendMode);return s.uuid=e.uuid,s}static toJSON(e){const t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode};for(let s=0,a=n.length;s!==a;++s)t.push(xn.toJSON(n[s]));return r}static CreateFromMorphTargetSequence(e,t,n,r){const s=t.length,a=[];for(let o=0;o<s;o++){let l=[],c=[];l.push((o+s-1)%s,o,(o+1)%s),c.push(0,1,0);const h=Ex(l);l=Ac(l,1,h),c=Ac(c,1,h),!r&&l[0]===0&&(l.push(s),c.push(c[0])),a.push(new Dr(".morphTargetInfluences["+t[o].name+"]",l,c).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const r=e;n=r.geometry&&r.geometry.animations||r.animations}for(let r=0;r<n.length;r++)if(n[r].name===t)return n[r];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const r={},s=/^([\w-]*?)([\d]+)$/;for(let o=0,l=e.length;o<l;o++){const c=e[o],h=c.name.match(s);if(h&&h.length>1){const u=h[1];let d=r[u];d||(r[u]=d=[]),d.push(c)}}const a=[];for(const o in r)a.push(this.CreateFromMorphTargetSequence(o,r[o],t,n));return a}static parseAnimation(e,t){if(!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(u,d,f,g,x){if(f.length!==0){const m=[],p=[];Uh(f,m,p,g),m.length!==0&&x.push(new u(d,m,p))}},r=[],s=e.name||"default",a=e.fps||30,o=e.blendMode;let l=e.length||-1;const c=e.hierarchy||[];for(let u=0;u<c.length;u++){const d=c[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){const f={};let g;for(g=0;g<d.length;g++)if(d[g].morphTargets)for(let x=0;x<d[g].morphTargets.length;x++)f[d[g].morphTargets[x]]=-1;for(const x in f){const m=[],p=[];for(let v=0;v!==d[g].morphTargets.length;++v){const _=d[g];m.push(_.time),p.push(_.morphTarget===x?1:0)}r.push(new Dr(".morphTargetInfluence["+x+"]",m,p))}l=f.length*a}else{const f=".bones["+t[u].name+"]";n(Ur,f+".position",d,"pos",r),n(Si,f+".quaternion",d,"rot",r),n(Ur,f+".scale",d,"scl",r)}}return r.length===0?null:new this(s,l,r,o)}resetDuration(){const e=this.tracks;let t=0;for(let n=0,r=e.length;n!==r;++n){const s=this.tracks[n];t=Math.max(t,s.times[s.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());return new this.constructor(this.name,this.duration,e,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}}function Rx(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Dr;case"vector":case"vector2":case"vector3":case"vector4":return Ur;case"color":return Nh;case"quaternion":return Si;case"bool":case"boolean":return ur;case"string":return dr}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function Cx(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=Rx(i.type);if(i.times===void 0){const t=[],n=[];Uh(i.keys,t,n,"value"),i.times=t,i.values=n}return e.parse!==void 0?e.parse(i):new e(i.name,i.times,i.values,i.interpolation)}const Ds={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};class Px{constructor(e,t,n){const r=this;let s=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(h){o++,s===!1&&r.onStart!==void 0&&r.onStart(h,a,o),s=!0},this.itemEnd=function(h){a++,r.onProgress!==void 0&&r.onProgress(h,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(h){r.onError!==void 0&&r.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null}}}const Lx=new Px;class bi{constructor(e){this.manager=e!==void 0?e:Lx,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(r,s){n.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}}bi.DEFAULT_MATERIAL_NAME="__DEFAULT";const An={};class Ix extends Error{constructor(e,t){super(e),this.response=t}}class Dx extends bi{constructor(e){super(e)}load(e,t,n,r){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=Ds.get(e);if(s!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(s),this.manager.itemEnd(e)},0),s;if(An[e]!==void 0){An[e].push({onLoad:t,onProgress:n,onError:r});return}An[e]=[],An[e].push({onLoad:t,onProgress:n,onError:r});const a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin"}),o=this.mimeType,l=this.responseType;fetch(a).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=An[e],u=c.body.getReader(),d=c.headers.get("Content-Length")||c.headers.get("X-File-Size"),f=d?parseInt(d):0,g=f!==0;let x=0;const m=new ReadableStream({start(p){v();function v(){u.read().then(({done:_,value:b})=>{if(_)p.close();else{x+=b.byteLength;const C=new ProgressEvent("progress",{lengthComputable:g,loaded:x,total:f});for(let w=0,T=h.length;w<T;w++){const D=h[w];D.onProgress&&D.onProgress(C)}p.enqueue(b),v()}})}}});return new Response(m)}else throw new Ix(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return c.json();default:if(o===void 0)return c.text();{const u=/charset="?([^;"\s]*)"?/i.exec(o),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{Ds.add(e,c);const h=An[e];delete An[e];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=An[e];if(h===void 0)throw this.manager.itemError(e),c;delete An[e];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onError&&f.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}}class Ux extends bi{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=Ds.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;const o=Cr("img");function l(){h(),Ds.add(e,this),t&&t(this),s.manager.itemEnd(e)}function c(u){h(),r&&r(u),s.manager.itemError(e),s.manager.itemEnd(e)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),s.manager.itemStart(e),o.src=e,o}}class Fx extends bi{constructor(e){super(e)}load(e,t,n,r){const s=new Mt,a=new Ux(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},n,r),s}}class Br extends rt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ie(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}class Nx extends Br{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(rt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ie(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Fa=new Te,Tc=new P,wc=new P;class Lo{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Le(512,512),this.map=null,this.mapPass=null,this.matrix=new Te,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Mo,this._frameExtents=new Le(1,1),this._viewportCount=1,this._viewports=[new Qe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Tc.setFromMatrixPosition(e.matrixWorld),t.position.copy(Tc),wc.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(wc),t.updateMatrixWorld(),Fa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Fa),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Fa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Ox extends Lo{constructor(){super(new Ot(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){const t=this.camera,n=ar*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height,s=e.distance||t.far;(n!==t.fov||r!==t.aspect||s!==t.far)&&(t.fov=n,t.aspect=r,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class Bx extends Br{constructor(e,t,n=0,r=Math.PI/3,s=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(rt.DEFAULT_UP),this.updateMatrix(),this.target=new rt,this.distance=n,this.angle=r,this.penumbra=s,this.decay=a,this.map=null,this.shadow=new Ox}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}const Rc=new Te,xr=new P,Na=new P;class kx extends Lo{constructor(){super(new Ot(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Le(4,2),this._viewportCount=6,this._viewports=[new Qe(2,1,1,1),new Qe(0,1,1,1),new Qe(3,1,1,1),new Qe(1,1,1,1),new Qe(3,0,1,1),new Qe(1,0,1,1)],this._cubeDirections=[new P(1,0,0),new P(-1,0,0),new P(0,0,1),new P(0,0,-1),new P(0,1,0),new P(0,-1,0)],this._cubeUps=[new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,0,1),new P(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,r=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),xr.setFromMatrixPosition(e.matrixWorld),n.position.copy(xr),Na.copy(n.position),Na.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Na),n.updateMatrixWorld(),r.makeTranslation(-xr.x,-xr.y,-xr.z),Rc.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Rc)}}class Cc extends Br{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=r,this.shadow=new kx}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class zx extends Lo{constructor(){super(new Ao(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Oh extends Br{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(rt.DEFAULT_UP),this.updateMatrix(),this.target=new rt,this.shadow=new zx}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Gx extends Br{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Vx{static decodeText(e){if(typeof TextDecoder<"u")return new TextDecoder().decode(e);let t="";for(let n=0,r=e.length;n<r;n++)t+=String.fromCharCode(e[n]);try{return decodeURIComponent(escape(t))}catch{return t}}static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}class Hx{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Pc(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=Pc();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function Pc(){return(typeof performance>"u"?Date:performance).now()}class Wx{constructor(e,t,n){this.binding=e,this.valueSize=n;let r,s,a;switch(t){case"quaternion":r=this._slerp,s=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":r=this._select,s=this._select,a=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:r=this._lerp,s=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=r,this._mixBufferRegionAdditive=s,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){const n=this.buffer,r=this.valueSize,s=e*r+r;let a=this.cumulativeWeight;if(a===0){for(let o=0;o!==r;++o)n[s+o]=n[o];a=t}else{a+=t;const o=t/a;this._mixBufferRegion(n,s,0,o,r)}this.cumulativeWeight=a}accumulateAdditive(e){const t=this.buffer,n=this.valueSize,r=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,r,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){const t=this.valueSize,n=this.buffer,r=e*t+t,s=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,s<1){const l=t*this._origIndex;this._mixBufferRegion(n,r,l,1-s,t)}a>0&&this._mixBufferRegionAdditive(n,r,this._addIndex*t,1,t);for(let l=t,c=t+t;l!==c;++l)if(n[l]!==n[l+t]){o.setValue(n,r);break}}saveOriginalState(){const e=this.binding,t=this.buffer,n=this.valueSize,r=n*this._origIndex;e.getValue(t,r);for(let s=n,a=r;s!==a;++s)t[s]=t[r+s%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){const e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){const e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){const e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,r,s){if(r>=.5)for(let a=0;a!==s;++a)e[t+a]=e[n+a]}_slerp(e,t,n,r){gt.slerpFlat(e,t,e,t,e,n,r)}_slerpAdditive(e,t,n,r,s){const a=this._workIndex*s;gt.multiplyQuaternionsFlat(e,a,e,t,e,n),gt.slerpFlat(e,t,e,t,e,a,r)}_lerp(e,t,n,r,s){const a=1-r;for(let o=0;o!==s;++o){const l=t+o;e[l]=e[l]*a+e[n+o]*r}}_lerpAdditive(e,t,n,r,s){for(let a=0;a!==s;++a){const o=t+a;e[o]=e[o]+e[n+a]*r}}}const Io="\\[\\]\\.:\\/",Xx=new RegExp("["+Io+"]","g"),Do="[^"+Io+"]",jx="[^"+Io.replace("\\.","")+"]",Yx=/((?:WC+[\/:])*)/.source.replace("WC",Do),$x=/(WCOD+)?/.source.replace("WCOD",jx),qx=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Do),Kx=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Do),Zx=new RegExp("^"+Yx+$x+qx+Kx+"$"),Jx=["material","materials","bones","map"];class Qx{constructor(e,t,n){const r=n||Ke.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=n.length;r!==s;++r)n[r].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class Ke{constructor(e,t,n){this.path=t,this.parsedPath=n||Ke.parseTrackName(t),this.node=Ke.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new Ke.Composite(e,t,n):new Ke(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Xx,"")}static parseTrackName(e){const t=Zx.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){const s=n.nodeName.substring(r+1);Jx.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(s){for(let a=0;a<s.length;a++){const o=s[a];if(o.name===t||o.uuid===t)return o;const l=n(o.children);if(l)return l}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,r=t.propertyName;let s=t.propertyIndex;if(e||(e=Ke.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const a=e[r];if(a===void 0){const c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}Ke.Composite=Qx;Ke.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ke.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ke.prototype.GetterByBindingType=[Ke.prototype._getValue_direct,Ke.prototype._getValue_array,Ke.prototype._getValue_arrayElement,Ke.prototype._getValue_toArray];Ke.prototype.SetterByBindingTypeAndVersioning=[[Ke.prototype._setValue_direct,Ke.prototype._setValue_direct_setNeedsUpdate,Ke.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ke.prototype._setValue_array,Ke.prototype._setValue_array_setNeedsUpdate,Ke.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ke.prototype._setValue_arrayElement,Ke.prototype._setValue_arrayElement_setNeedsUpdate,Ke.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ke.prototype._setValue_fromArray,Ke.prototype._setValue_fromArray_setNeedsUpdate,Ke.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class e0{constructor(e,t,n=null,r=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=r;const s=t.tracks,a=s.length,o=new Array(a),l={endingStart:Yi,endingEnd:Yi};for(let c=0;c!==a;++c){const h=s[c].createInterpolant(null);o[c]=h,h.settings=l}this._interpolantSettings=l,this._interpolants=o,this._propertyBindings=new Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=ch,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n){if(e.fadeOut(t),this.fadeIn(t),n){const r=this._clip.duration,s=e._clip.duration,a=s/r,o=r/s;e.warp(1,a,t),this.warp(o,1,t)}return this}crossFadeTo(e,t,n){return e.crossFadeFrom(this,t,n)}stopFading(){const e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){const r=this._mixer,s=r.time,a=this.timeScale;let o=this._timeScaleInterpolant;o===null&&(o=r._lendControlInterpolant(),this._timeScaleInterpolant=o);const l=o.parameterPositions,c=o.sampleValues;return l[0]=s,l[1]=s+n,c[0]=e/a,c[1]=t/a,this}stopWarping(){const e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,r){if(!this.enabled){this._updateWeight(e);return}const s=this._startTime;if(s!==null){const l=(e-s)*n;l<0||n===0?t=0:(this._startTime=null,t=n*l)}t*=this._updateTimeScale(e);const a=this._updateTime(t),o=this._updateWeight(e);if(o>0){const l=this._interpolants,c=this._propertyBindings;switch(this.blendMode){case Sd:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(a),c[h].accumulateAdditive(o);break;case xo:default:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(a),c[h].accumulate(r,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;const n=this._weightInterpolant;if(n!==null){const r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(this.stopFading(),r===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;const n=this._timeScaleInterpolant;if(n!==null){const r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){const t=this._clip.duration,n=this.loop;let r=this.time+e,s=this._loopCount;const a=n===yd;if(e===0)return s===-1?r:a&&(s&1)===1?t-r:r;if(n===vd){s===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(r>=t)r=t;else if(r<0)r=0;else{this.time=r;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=r,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(s===-1&&(e>=0?(s=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),r>=t||r<0){const o=Math.floor(r/t);r-=t*o,s+=Math.abs(o);const l=this.repetitions-s;if(l<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,r=e>0?t:0,this.time=r,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(l===1){const c=e<0;this._setEndings(c,!c,a)}else this._setEndings(!1,!1,a);this._loopCount=s,this.time=r,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:o})}}else this.time=r;if(a&&(s&1)===1)return t-r}return r}_setEndings(e,t,n){const r=this._interpolantSettings;n?(r.endingStart=$i,r.endingEnd=$i):(e?r.endingStart=this.zeroSlopeAtStart?$i:Yi:r.endingStart=Ts,t?r.endingEnd=this.zeroSlopeAtEnd?$i:Yi:r.endingEnd=Ts)}_scheduleFading(e,t,n){const r=this._mixer,s=r.time;let a=this._weightInterpolant;a===null&&(a=r._lendControlInterpolant(),this._weightInterpolant=a);const o=a.parameterPositions,l=a.sampleValues;return o[0]=s,l[0]=t,o[1]=s+e,l[1]=n,this}}const t0=new Float32Array(1);class n0 extends Qn{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(e,t){const n=e._localRoot||this._root,r=e._clip.tracks,s=r.length,a=e._propertyBindings,o=e._interpolants,l=n.uuid,c=this._bindingsByRootAndName;let h=c[l];h===void 0&&(h={},c[l]=h);for(let u=0;u!==s;++u){const d=r[u],f=d.name;let g=h[f];if(g!==void 0)++g.referenceCount,a[u]=g;else{if(g=a[u],g!==void 0){g._cacheIndex===null&&(++g.referenceCount,this._addInactiveBinding(g,l,f));continue}const x=t&&t._propertyBindings[u].binding.parsedPath;g=new Wx(Ke.create(n,f,x),d.ValueTypeName,d.getValueSize()),++g.referenceCount,this._addInactiveBinding(g,l,f),a[u]=g}o[u].resultBuffer=g.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){const n=(e._localRoot||this._root).uuid,r=e._clip.uuid,s=this._actionsByClip[r];this._bindAction(e,s&&s.knownActions[0]),this._addInactiveAction(e,r,n)}const t=e._propertyBindings;for(let n=0,r=t.length;n!==r;++n){const s=t[n];s.useCount++===0&&(this._lendBinding(s),s.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){const t=e._propertyBindings;for(let n=0,r=t.length;n!==r;++n){const s=t[n];--s.useCount===0&&(s.restoreOriginalState(),this._takeBackBinding(s))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;const e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){const t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){const r=this._actions,s=this._actionsByClip;let a=s[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,s[t]=a;else{const o=a.knownActions;e._byClipCacheIndex=o.length,o.push(e)}e._cacheIndex=r.length,r.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){const t=this._actions,n=t[t.length-1],r=e._cacheIndex;n._cacheIndex=r,t[r]=n,t.pop(),e._cacheIndex=null;const s=e._clip.uuid,a=this._actionsByClip,o=a[s],l=o.knownActions,c=l[l.length-1],h=e._byClipCacheIndex;c._byClipCacheIndex=h,l[h]=c,l.pop(),e._byClipCacheIndex=null;const u=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],l.length===0&&delete a[s],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){const t=e._propertyBindings;for(let n=0,r=t.length;n!==r;++n){const s=t[n];--s.referenceCount===0&&this._removeInactiveBinding(s)}}_lendAction(e){const t=this._actions,n=e._cacheIndex,r=this._nActiveActions++,s=t[r];e._cacheIndex=r,t[r]=e,s._cacheIndex=n,t[n]=s}_takeBackAction(e){const t=this._actions,n=e._cacheIndex,r=--this._nActiveActions,s=t[r];e._cacheIndex=r,t[r]=e,s._cacheIndex=n,t[n]=s}_addInactiveBinding(e,t,n){const r=this._bindingsByRootAndName,s=this._bindings;let a=r[t];a===void 0&&(a={},r[t]=a),a[n]=e,e._cacheIndex=s.length,s.push(e)}_removeInactiveBinding(e){const t=this._bindings,n=e.binding,r=n.rootNode.uuid,s=n.path,a=this._bindingsByRootAndName,o=a[r],l=t[t.length-1],c=e._cacheIndex;l._cacheIndex=c,t[c]=l,t.pop(),delete o[s],Object.keys(o).length===0&&delete a[r]}_lendBinding(e){const t=this._bindings,n=e._cacheIndex,r=this._nActiveBindings++,s=t[r];e._cacheIndex=r,t[r]=e,s._cacheIndex=n,t[n]=s}_takeBackBinding(e){const t=this._bindings,n=e._cacheIndex,r=--this._nActiveBindings,s=t[r];e._cacheIndex=r,t[r]=e,s._cacheIndex=n,t[n]=s}_lendControlInterpolant(){const e=this._controlInterpolants,t=this._nActiveControlInterpolants++;let n=e[t];return n===void 0&&(n=new Fh(new Float32Array(2),new Float32Array(2),1,t0),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){const t=this._controlInterpolants,n=e.__cacheIndex,r=--this._nActiveControlInterpolants,s=t[r];e.__cacheIndex=r,t[r]=e,s.__cacheIndex=n,t[n]=s}clipAction(e,t,n){const r=t||this._root,s=r.uuid;let a=typeof e=="string"?lo.findByName(r,e):e;const o=a!==null?a.uuid:e,l=this._actionsByClip[o];let c=null;if(n===void 0&&(a!==null?n=a.blendMode:n=xo),l!==void 0){const u=l.actionByRoot[s];if(u!==void 0&&u.blendMode===n)return u;c=l.knownActions[0],a===null&&(a=c._clip)}if(a===null)return null;const h=new e0(this,a,t,n);return this._bindAction(h,c),this._addInactiveAction(h,o,s),h}existingAction(e,t){const n=t||this._root,r=n.uuid,s=typeof e=="string"?lo.findByName(n,e):e,a=s?s.uuid:e,o=this._actionsByClip[a];return o!==void 0&&o.actionByRoot[r]||null}stopAllAction(){const e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;const t=this._actions,n=this._nActiveActions,r=this.time+=e,s=Math.sign(e),a=this._accuIndex^=1;for(let c=0;c!==n;++c)t[c]._update(r,e,s,a);const o=this._bindings,l=this._nActiveBindings;for(let c=0;c!==l;++c)o[c].apply(a);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){const t=this._actions,n=e.uuid,r=this._actionsByClip,s=r[n];if(s!==void 0){const a=s.knownActions;for(let o=0,l=a.length;o!==l;++o){const c=a[o];this._deactivateAction(c);const h=c._cacheIndex,u=t[t.length-1];c._cacheIndex=null,c._byClipCacheIndex=null,u._cacheIndex=h,t[h]=u,t.pop(),this._removeInactiveBindingsForAction(c)}delete r[n]}}uncacheRoot(e){const t=e.uuid,n=this._actionsByClip;for(const a in n){const o=n[a].actionByRoot,l=o[t];l!==void 0&&(this._deactivateAction(l),this._removeInactiveAction(l))}const r=this._bindingsByRootAndName,s=r[t];if(s!==void 0)for(const a in s){const o=s[a];o.restoreOriginalState(),this._removeInactiveBinding(o)}}uncacheAction(e,t){const n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}}class Lc{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(St(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Ic=new P;let gs,Oa;class Bh extends rt{constructor(e=new P(0,0,1),t=new P(0,0,0),n=1,r=16776960,s=n*.2,a=s*.2){super(),this.type="ArrowHelper",gs===void 0&&(gs=new It,gs.setAttribute("position",new ct([0,0,0,0,1,0],3)),Oa=new Co(0,.5,1,5,1),Oa.translate(0,-.5,0)),this.position.copy(t),this.line=new Ro(gs,new Or({color:r,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new kt(Oa,new Ai({color:r,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(e),this.setLength(n,s,a)}setDirection(e){if(e.y>.99999)this.quaternion.set(0,0,0,1);else if(e.y<-.99999)this.quaternion.set(1,0,0,0);else{Ic.set(e.z,0,-e.x).normalize();const t=Math.acos(e.y);this.quaternion.setFromAxisAngle(Ic,t)}}setLength(e,t=e*.2,n=t*.2){this.line.scale.set(1,Math.max(1e-4,e-t),1),this.line.updateMatrix(),this.cone.scale.set(n,t,n),this.cone.position.y=e,this.cone.updateMatrix()}setColor(e){this.line.material.color.set(e),this.cone.material.color.set(e)}copy(e){return super.copy(e,!1),this.line.copy(e.line),this.cone.copy(e.cone),this}dispose(){this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:go}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=go);const Dc={type:"change"},Ba={type:"start"},Uc={type:"end"},_s=new Xs,Fc=new zn,i0=Math.cos(70*Ct.DEG2RAD);class r0 extends Qn{constructor(e,t){super(),this.object=e,this.domElement=t,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new P,this.cursor=new P,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:kn.ROTATE,MIDDLE:kn.DOLLY,RIGHT:kn.PAN},this.touches={ONE:wi.ROTATE,TWO:wi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return o.phi},this.getAzimuthalAngle=function(){return o.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(R){R.addEventListener("keydown",Re),this._domElementKeyEvents=R},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",Re),this._domElementKeyEvents=null},this.saveState=function(){n.target0.copy(n.target),n.position0.copy(n.object.position),n.zoom0=n.object.zoom},this.reset=function(){n.target.copy(n.target0),n.object.position.copy(n.position0),n.object.zoom=n.zoom0,n.object.updateProjectionMatrix(),n.dispatchEvent(Dc),n.update(),s=r.NONE},this.update=function(){const R=new P,re=new gt().setFromUnitVectors(e.up,new P(0,1,0)),ye=re.clone().invert(),me=new P,te=new gt,L=new P,se=2*Math.PI;return function(Ce=null){const Ae=n.object.position;R.copy(Ae).sub(n.target),R.applyQuaternion(re),o.setFromVector3(R),n.autoRotate&&s===r.NONE&&W(A(Ce)),n.enableDamping?(o.theta+=l.theta*n.dampingFactor,o.phi+=l.phi*n.dampingFactor):(o.theta+=l.theta,o.phi+=l.phi);let $e=n.minAzimuthAngle,qe=n.maxAzimuthAngle;isFinite($e)&&isFinite(qe)&&($e<-Math.PI?$e+=se:$e>Math.PI&&($e-=se),qe<-Math.PI?qe+=se:qe>Math.PI&&(qe-=se),$e<=qe?o.theta=Math.max($e,Math.min(qe,o.theta)):o.theta=o.theta>($e+qe)/2?Math.max($e,o.theta):Math.min(qe,o.theta)),o.phi=Math.max(n.minPolarAngle,Math.min(n.maxPolarAngle,o.phi)),o.makeSafe(),n.enableDamping===!0?n.target.addScaledVector(h,n.dampingFactor):n.target.add(h),n.target.sub(n.cursor),n.target.clampLength(n.minTargetRadius,n.maxTargetRadius),n.target.add(n.cursor),n.zoomToCursor&&w||n.object.isOrthographicCamera?o.radius=q(o.radius):o.radius=q(o.radius*c),R.setFromSpherical(o),R.applyQuaternion(ye),Ae.copy(n.target).add(R),n.object.lookAt(n.target),n.enableDamping===!0?(l.theta*=1-n.dampingFactor,l.phi*=1-n.dampingFactor,h.multiplyScalar(1-n.dampingFactor)):(l.set(0,0,0),h.set(0,0,0));let ot=!1;if(n.zoomToCursor&&w){let ht=null;if(n.object.isPerspectiveCamera){const Ze=R.length();ht=q(Ze*c);const pt=Ze-ht;n.object.position.addScaledVector(b,pt),n.object.updateMatrixWorld()}else if(n.object.isOrthographicCamera){const Ze=new P(C.x,C.y,0);Ze.unproject(n.object),n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/c)),n.object.updateProjectionMatrix(),ot=!0;const pt=new P(C.x,C.y,0);pt.unproject(n.object),n.object.position.sub(pt).add(Ze),n.object.updateMatrixWorld(),ht=R.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),n.zoomToCursor=!1;ht!==null&&(this.screenSpacePanning?n.target.set(0,0,-1).transformDirection(n.object.matrix).multiplyScalar(ht).add(n.object.position):(_s.origin.copy(n.object.position),_s.direction.set(0,0,-1).transformDirection(n.object.matrix),Math.abs(n.object.up.dot(_s.direction))<i0?e.lookAt(n.target):(Fc.setFromNormalAndCoplanarPoint(n.object.up,n.target),_s.intersectPlane(Fc,n.target))))}else n.object.isOrthographicCamera&&(n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/c)),n.object.updateProjectionMatrix(),ot=!0);return c=1,w=!1,ot||me.distanceToSquared(n.object.position)>a||8*(1-te.dot(n.object.quaternion))>a||L.distanceToSquared(n.target)>0?(n.dispatchEvent(Dc),me.copy(n.object.position),te.copy(n.object.quaternion),L.copy(n.target),!0):!1}}(),this.dispose=function(){n.domElement.removeEventListener("contextmenu",Je),n.domElement.removeEventListener("pointerdown",E),n.domElement.removeEventListener("pointercancel",O),n.domElement.removeEventListener("wheel",ie),n.domElement.removeEventListener("pointermove",y),n.domElement.removeEventListener("pointerup",O),n._domElementKeyEvents!==null&&(n._domElementKeyEvents.removeEventListener("keydown",Re),n._domElementKeyEvents=null)};const n=this,r={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let s=r.NONE;const a=1e-6,o=new Lc,l=new Lc;let c=1;const h=new P,u=new Le,d=new Le,f=new Le,g=new Le,x=new Le,m=new Le,p=new Le,v=new Le,_=new Le,b=new P,C=new Le;let w=!1;const T=[],D={};let S=!1;function A(R){return R!==null?2*Math.PI/60*n.autoRotateSpeed*R:2*Math.PI/60/60*n.autoRotateSpeed}function N(R){const re=Math.abs(R*.01);return Math.pow(.95,n.zoomSpeed*re)}function W(R){l.theta-=R}function Z(R){l.phi-=R}const I=function(){const R=new P;return function(ye,me){R.setFromMatrixColumn(me,0),R.multiplyScalar(-ye),h.add(R)}}(),F=function(){const R=new P;return function(ye,me){n.screenSpacePanning===!0?R.setFromMatrixColumn(me,1):(R.setFromMatrixColumn(me,0),R.crossVectors(n.object.up,R)),R.multiplyScalar(ye),h.add(R)}}(),z=function(){const R=new P;return function(ye,me){const te=n.domElement;if(n.object.isPerspectiveCamera){const L=n.object.position;R.copy(L).sub(n.target);let se=R.length();se*=Math.tan(n.object.fov/2*Math.PI/180),I(2*ye*se/te.clientHeight,n.object.matrix),F(2*me*se/te.clientHeight,n.object.matrix)}else n.object.isOrthographicCamera?(I(ye*(n.object.right-n.object.left)/n.object.zoom/te.clientWidth,n.object.matrix),F(me*(n.object.top-n.object.bottom)/n.object.zoom/te.clientHeight,n.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),n.enablePan=!1)}}();function $(R){n.object.isPerspectiveCamera||n.object.isOrthographicCamera?c/=R:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function X(R){n.object.isPerspectiveCamera||n.object.isOrthographicCamera?c*=R:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function Y(R,re){if(!n.zoomToCursor)return;w=!0;const ye=n.domElement.getBoundingClientRect(),me=R-ye.left,te=re-ye.top,L=ye.width,se=ye.height;C.x=me/L*2-1,C.y=-(te/se)*2+1,b.set(C.x,C.y,1).unproject(n.object).sub(n.object.position).normalize()}function q(R){return Math.max(n.minDistance,Math.min(n.maxDistance,R))}function J(R){u.set(R.clientX,R.clientY)}function oe(R){Y(R.clientX,R.clientX),p.set(R.clientX,R.clientY)}function V(R){g.set(R.clientX,R.clientY)}function K(R){d.set(R.clientX,R.clientY),f.subVectors(d,u).multiplyScalar(n.rotateSpeed);const re=n.domElement;W(2*Math.PI*f.x/re.clientHeight),Z(2*Math.PI*f.y/re.clientHeight),u.copy(d),n.update()}function le(R){v.set(R.clientX,R.clientY),_.subVectors(v,p),_.y>0?$(N(_.y)):_.y<0&&X(N(_.y)),p.copy(v),n.update()}function _e(R){x.set(R.clientX,R.clientY),m.subVectors(x,g).multiplyScalar(n.panSpeed),z(m.x,m.y),g.copy(x),n.update()}function ce(R){Y(R.clientX,R.clientY),R.deltaY<0?X(N(R.deltaY)):R.deltaY>0&&$(N(R.deltaY)),n.update()}function Me(R){let re=!1;switch(R.code){case n.keys.UP:R.ctrlKey||R.metaKey||R.shiftKey?Z(2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):z(0,n.keyPanSpeed),re=!0;break;case n.keys.BOTTOM:R.ctrlKey||R.metaKey||R.shiftKey?Z(-2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):z(0,-n.keyPanSpeed),re=!0;break;case n.keys.LEFT:R.ctrlKey||R.metaKey||R.shiftKey?W(2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):z(n.keyPanSpeed,0),re=!0;break;case n.keys.RIGHT:R.ctrlKey||R.metaKey||R.shiftKey?W(-2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):z(-n.keyPanSpeed,0),re=!0;break}re&&(R.preventDefault(),n.update())}function De(R){if(T.length===1)u.set(R.pageX,R.pageY);else{const re=fe(R),ye=.5*(R.pageX+re.x),me=.5*(R.pageY+re.y);u.set(ye,me)}}function we(R){if(T.length===1)g.set(R.pageX,R.pageY);else{const re=fe(R),ye=.5*(R.pageX+re.x),me=.5*(R.pageY+re.y);g.set(ye,me)}}function Ye(R){const re=fe(R),ye=R.pageX-re.x,me=R.pageY-re.y,te=Math.sqrt(ye*ye+me*me);p.set(0,te)}function B(R){n.enableZoom&&Ye(R),n.enablePan&&we(R)}function Et(R){n.enableZoom&&Ye(R),n.enableRotate&&De(R)}function Ee(R){if(T.length==1)d.set(R.pageX,R.pageY);else{const ye=fe(R),me=.5*(R.pageX+ye.x),te=.5*(R.pageY+ye.y);d.set(me,te)}f.subVectors(d,u).multiplyScalar(n.rotateSpeed);const re=n.domElement;W(2*Math.PI*f.x/re.clientHeight),Z(2*Math.PI*f.y/re.clientHeight),u.copy(d)}function Ue(R){if(T.length===1)x.set(R.pageX,R.pageY);else{const re=fe(R),ye=.5*(R.pageX+re.x),me=.5*(R.pageY+re.y);x.set(ye,me)}m.subVectors(x,g).multiplyScalar(n.panSpeed),z(m.x,m.y),g.copy(x)}function xe(R){const re=fe(R),ye=R.pageX-re.x,me=R.pageY-re.y,te=Math.sqrt(ye*ye+me*me);v.set(0,te),_.set(0,Math.pow(v.y/p.y,n.zoomSpeed)),$(_.y),p.copy(v);const L=(R.pageX+re.x)*.5,se=(R.pageY+re.y)*.5;Y(L,se)}function tt(R){n.enableZoom&&xe(R),n.enablePan&&Ue(R)}function Be(R){n.enableZoom&&xe(R),n.enableRotate&&Ee(R)}function E(R){n.enabled!==!1&&(T.length===0&&(n.domElement.setPointerCapture(R.pointerId),n.domElement.addEventListener("pointermove",y),n.domElement.addEventListener("pointerup",O)),Ve(R),R.pointerType==="touch"?ke(R):ne(R))}function y(R){n.enabled!==!1&&(R.pointerType==="touch"?Q(R):ee(R))}function O(R){Fe(R),T.length===0&&(n.domElement.releasePointerCapture(R.pointerId),n.domElement.removeEventListener("pointermove",y),n.domElement.removeEventListener("pointerup",O)),n.dispatchEvent(Uc),s=r.NONE}function ne(R){let re;switch(R.button){case 0:re=n.mouseButtons.LEFT;break;case 1:re=n.mouseButtons.MIDDLE;break;case 2:re=n.mouseButtons.RIGHT;break;default:re=-1}switch(re){case kn.DOLLY:if(n.enableZoom===!1)return;oe(R),s=r.DOLLY;break;case kn.ROTATE:if(R.ctrlKey||R.metaKey||R.shiftKey){if(n.enablePan===!1)return;V(R),s=r.PAN}else{if(n.enableRotate===!1)return;J(R),s=r.ROTATE}break;case kn.PAN:if(R.ctrlKey||R.metaKey||R.shiftKey){if(n.enableRotate===!1)return;J(R),s=r.ROTATE}else{if(n.enablePan===!1)return;V(R),s=r.PAN}break;default:s=r.NONE}s!==r.NONE&&n.dispatchEvent(Ba)}function ee(R){switch(s){case r.ROTATE:if(n.enableRotate===!1)return;K(R);break;case r.DOLLY:if(n.enableZoom===!1)return;le(R);break;case r.PAN:if(n.enablePan===!1)return;_e(R);break}}function ie(R){n.enabled===!1||n.enableZoom===!1||s!==r.NONE||(R.preventDefault(),n.dispatchEvent(Ba),ce(ve(R)),n.dispatchEvent(Uc))}function ve(R){const re=R.deltaMode,ye={clientX:R.clientX,clientY:R.clientY,deltaY:R.deltaY};switch(re){case 1:ye.deltaY*=16;break;case 2:ye.deltaY*=100;break}return R.ctrlKey&&!S&&(ye.deltaY*=10),ye}function de(R){R.key==="Control"&&(S=!0,document.addEventListener("keyup",ge,{passive:!0,capture:!0}))}function ge(R){R.key==="Control"&&(S=!1,document.removeEventListener("keyup",ge,{passive:!0,capture:!0}))}function Re(R){n.enabled===!1||n.enablePan===!1||Me(R)}function ke(R){switch(be(R),T.length){case 1:switch(n.touches.ONE){case wi.ROTATE:if(n.enableRotate===!1)return;De(R),s=r.TOUCH_ROTATE;break;case wi.PAN:if(n.enablePan===!1)return;we(R),s=r.TOUCH_PAN;break;default:s=r.NONE}break;case 2:switch(n.touches.TWO){case wi.DOLLY_PAN:if(n.enableZoom===!1&&n.enablePan===!1)return;B(R),s=r.TOUCH_DOLLY_PAN;break;case wi.DOLLY_ROTATE:if(n.enableZoom===!1&&n.enableRotate===!1)return;Et(R),s=r.TOUCH_DOLLY_ROTATE;break;default:s=r.NONE}break;default:s=r.NONE}s!==r.NONE&&n.dispatchEvent(Ba)}function Q(R){switch(be(R),s){case r.TOUCH_ROTATE:if(n.enableRotate===!1)return;Ee(R),n.update();break;case r.TOUCH_PAN:if(n.enablePan===!1)return;Ue(R),n.update();break;case r.TOUCH_DOLLY_PAN:if(n.enableZoom===!1&&n.enablePan===!1)return;tt(R),n.update();break;case r.TOUCH_DOLLY_ROTATE:if(n.enableZoom===!1&&n.enableRotate===!1)return;Be(R),n.update();break;default:s=r.NONE}}function Je(R){n.enabled!==!1&&R.preventDefault()}function Ve(R){T.push(R.pointerId)}function Fe(R){delete D[R.pointerId];for(let re=0;re<T.length;re++)if(T[re]==R.pointerId){T.splice(re,1);return}}function be(R){let re=D[R.pointerId];re===void 0&&(re=new Le,D[R.pointerId]=re),re.set(R.pageX,R.pageY)}function fe(R){const re=R.pointerId===T[0]?T[1]:T[0];return D[re]}n.domElement.addEventListener("contextmenu",Je),n.domElement.addEventListener("pointerdown",E),n.domElement.addEventListener("pointercancel",O),n.domElement.addEventListener("wheel",ie,{passive:!1}),document.addEventListener("keydown",de,{passive:!0,capture:!0}),this.update()}}/**
 * lil-gui
 * https://lil-gui.georgealways.com
 * @version 0.19.2
 * @author George Michael Brower
 * @license MIT
 */class _n{constructor(e,t,n,r,s="div"){this.parent=e,this.object=t,this.property=n,this._disabled=!1,this._hidden=!1,this.initialValue=this.getValue(),this.domElement=document.createElement(s),this.domElement.classList.add("controller"),this.domElement.classList.add(r),this.$name=document.createElement("div"),this.$name.classList.add("name"),_n.nextNameID=_n.nextNameID||0,this.$name.id=`lil-gui-name-${++_n.nextNameID}`,this.$widget=document.createElement("div"),this.$widget.classList.add("widget"),this.$disable=this.$widget,this.domElement.appendChild(this.$name),this.domElement.appendChild(this.$widget),this.domElement.addEventListener("keydown",a=>a.stopPropagation()),this.domElement.addEventListener("keyup",a=>a.stopPropagation()),this.parent.children.push(this),this.parent.controllers.push(this),this.parent.$children.appendChild(this.domElement),this._listenCallback=this._listenCallback.bind(this),this.name(n)}name(e){return this._name=e,this.$name.textContent=e,this}onChange(e){return this._onChange=e,this}_callOnChange(){this.parent._callOnChange(this),this._onChange!==void 0&&this._onChange.call(this,this.getValue()),this._changed=!0}onFinishChange(e){return this._onFinishChange=e,this}_callOnFinishChange(){this._changed&&(this.parent._callOnFinishChange(this),this._onFinishChange!==void 0&&this._onFinishChange.call(this,this.getValue())),this._changed=!1}reset(){return this.setValue(this.initialValue),this._callOnFinishChange(),this}enable(e=!0){return this.disable(!e)}disable(e=!0){return e===this._disabled?this:(this._disabled=e,this.domElement.classList.toggle("disabled",e),this.$disable.toggleAttribute("disabled",e),this)}show(e=!0){return this._hidden=!e,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}options(e){const t=this.parent.add(this.object,this.property,e);return t.name(this._name),this.destroy(),t}min(e){return this}max(e){return this}step(e){return this}decimals(e){return this}listen(e=!0){return this._listening=e,this._listenCallbackID!==void 0&&(cancelAnimationFrame(this._listenCallbackID),this._listenCallbackID=void 0),this._listening&&this._listenCallback(),this}_listenCallback(){this._listenCallbackID=requestAnimationFrame(this._listenCallback);const e=this.save();e!==this._listenPrevValue&&this.updateDisplay(),this._listenPrevValue=e}getValue(){return this.object[this.property]}setValue(e){return this.getValue()!==e&&(this.object[this.property]=e,this._callOnChange(),this.updateDisplay()),this}updateDisplay(){return this}load(e){return this.setValue(e),this._callOnFinishChange(),this}save(){return this.getValue()}destroy(){this.listen(!1),this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.controllers.splice(this.parent.controllers.indexOf(this),1),this.parent.$children.removeChild(this.domElement)}}class s0 extends _n{constructor(e,t,n){super(e,t,n,"boolean","label"),this.$input=document.createElement("input"),this.$input.setAttribute("type","checkbox"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$widget.appendChild(this.$input),this.$input.addEventListener("change",()=>{this.setValue(this.$input.checked),this._callOnFinishChange()}),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.checked=this.getValue(),this}}function co(i){let e,t;return(e=i.match(/(#|0x)?([a-f0-9]{6})/i))?t=e[2]:(e=i.match(/rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/))?t=parseInt(e[1]).toString(16).padStart(2,0)+parseInt(e[2]).toString(16).padStart(2,0)+parseInt(e[3]).toString(16).padStart(2,0):(e=i.match(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i))&&(t=e[1]+e[1]+e[2]+e[2]+e[3]+e[3]),t?"#"+t:!1}const a0={isPrimitive:!0,match:i=>typeof i=="string",fromHexString:co,toHexString:co},Fr={isPrimitive:!0,match:i=>typeof i=="number",fromHexString:i=>parseInt(i.substring(1),16),toHexString:i=>"#"+i.toString(16).padStart(6,0)},o0={isPrimitive:!1,match:i=>Array.isArray(i),fromHexString(i,e,t=1){const n=Fr.fromHexString(i);e[0]=(n>>16&255)/255*t,e[1]=(n>>8&255)/255*t,e[2]=(n&255)/255*t},toHexString([i,e,t],n=1){n=255/n;const r=i*n<<16^e*n<<8^t*n<<0;return Fr.toHexString(r)}},l0={isPrimitive:!1,match:i=>Object(i)===i,fromHexString(i,e,t=1){const n=Fr.fromHexString(i);e.r=(n>>16&255)/255*t,e.g=(n>>8&255)/255*t,e.b=(n&255)/255*t},toHexString({r:i,g:e,b:t},n=1){n=255/n;const r=i*n<<16^e*n<<8^t*n<<0;return Fr.toHexString(r)}},c0=[a0,Fr,o0,l0];function h0(i){return c0.find(e=>e.match(i))}class u0 extends _n{constructor(e,t,n,r){super(e,t,n,"color"),this.$input=document.createElement("input"),this.$input.setAttribute("type","color"),this.$input.setAttribute("tabindex",-1),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$text=document.createElement("input"),this.$text.setAttribute("type","text"),this.$text.setAttribute("spellcheck","false"),this.$text.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("display"),this.$display.appendChild(this.$input),this.$widget.appendChild(this.$display),this.$widget.appendChild(this.$text),this._format=h0(this.initialValue),this._rgbScale=r,this._initialValueHexString=this.save(),this._textFocused=!1,this.$input.addEventListener("input",()=>{this._setValueFromHexString(this.$input.value)}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$text.addEventListener("input",()=>{const s=co(this.$text.value);s&&this._setValueFromHexString(s)}),this.$text.addEventListener("focus",()=>{this._textFocused=!0,this.$text.select()}),this.$text.addEventListener("blur",()=>{this._textFocused=!1,this.updateDisplay(),this._callOnFinishChange()}),this.$disable=this.$text,this.updateDisplay()}reset(){return this._setValueFromHexString(this._initialValueHexString),this}_setValueFromHexString(e){if(this._format.isPrimitive){const t=this._format.fromHexString(e);this.setValue(t)}else this._format.fromHexString(e,this.getValue(),this._rgbScale),this._callOnChange(),this.updateDisplay()}save(){return this._format.toHexString(this.getValue(),this._rgbScale)}load(e){return this._setValueFromHexString(e),this._callOnFinishChange(),this}updateDisplay(){return this.$input.value=this._format.toHexString(this.getValue(),this._rgbScale),this._textFocused||(this.$text.value=this.$input.value.substring(1)),this.$display.style.backgroundColor=this.$input.value,this}}class ka extends _n{constructor(e,t,n){super(e,t,n,"function"),this.$button=document.createElement("button"),this.$button.appendChild(this.$name),this.$widget.appendChild(this.$button),this.$button.addEventListener("click",r=>{r.preventDefault(),this.getValue().call(this.object),this._callOnChange()}),this.$button.addEventListener("touchstart",()=>{},{passive:!0}),this.$disable=this.$button}}class d0 extends _n{constructor(e,t,n,r,s,a){super(e,t,n,"number"),this._initInput(),this.min(r),this.max(s);const o=a!==void 0;this.step(o?a:this._getImplicitStep(),o),this.updateDisplay()}decimals(e){return this._decimals=e,this.updateDisplay(),this}min(e){return this._min=e,this._onUpdateMinMax(),this}max(e){return this._max=e,this._onUpdateMinMax(),this}step(e,t=!0){return this._step=e,this._stepExplicit=t,this}updateDisplay(){const e=this.getValue();if(this._hasSlider){let t=(e-this._min)/(this._max-this._min);t=Math.max(0,Math.min(t,1)),this.$fill.style.width=t*100+"%"}return this._inputFocused||(this.$input.value=this._decimals===void 0?e:e.toFixed(this._decimals)),this}_initInput(){this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("aria-labelledby",this.$name.id),window.matchMedia("(pointer: coarse)").matches&&(this.$input.setAttribute("type","number"),this.$input.setAttribute("step","any")),this.$widget.appendChild(this.$input),this.$disable=this.$input;const t=()=>{let v=parseFloat(this.$input.value);isNaN(v)||(this._stepExplicit&&(v=this._snap(v)),this.setValue(this._clamp(v)))},n=v=>{const _=parseFloat(this.$input.value);isNaN(_)||(this._snapClampSetValue(_+v),this.$input.value=this.getValue())},r=v=>{v.key==="Enter"&&this.$input.blur(),v.code==="ArrowUp"&&(v.preventDefault(),n(this._step*this._arrowKeyMultiplier(v))),v.code==="ArrowDown"&&(v.preventDefault(),n(this._step*this._arrowKeyMultiplier(v)*-1))},s=v=>{this._inputFocused&&(v.preventDefault(),n(this._step*this._normalizeMouseWheel(v)))};let a=!1,o,l,c,h,u;const d=5,f=v=>{o=v.clientX,l=c=v.clientY,a=!0,h=this.getValue(),u=0,window.addEventListener("mousemove",g),window.addEventListener("mouseup",x)},g=v=>{if(a){const _=v.clientX-o,b=v.clientY-l;Math.abs(b)>d?(v.preventDefault(),this.$input.blur(),a=!1,this._setDraggingStyle(!0,"vertical")):Math.abs(_)>d&&x()}if(!a){const _=v.clientY-c;u-=_*this._step*this._arrowKeyMultiplier(v),h+u>this._max?u=this._max-h:h+u<this._min&&(u=this._min-h),this._snapClampSetValue(h+u)}c=v.clientY},x=()=>{this._setDraggingStyle(!1,"vertical"),this._callOnFinishChange(),window.removeEventListener("mousemove",g),window.removeEventListener("mouseup",x)},m=()=>{this._inputFocused=!0},p=()=>{this._inputFocused=!1,this.updateDisplay(),this._callOnFinishChange()};this.$input.addEventListener("input",t),this.$input.addEventListener("keydown",r),this.$input.addEventListener("wheel",s,{passive:!1}),this.$input.addEventListener("mousedown",f),this.$input.addEventListener("focus",m),this.$input.addEventListener("blur",p)}_initSlider(){this._hasSlider=!0,this.$slider=document.createElement("div"),this.$slider.classList.add("slider"),this.$fill=document.createElement("div"),this.$fill.classList.add("fill"),this.$slider.appendChild(this.$fill),this.$widget.insertBefore(this.$slider,this.$input),this.domElement.classList.add("hasSlider");const e=(p,v,_,b,C)=>(p-v)/(_-v)*(C-b)+b,t=p=>{const v=this.$slider.getBoundingClientRect();let _=e(p,v.left,v.right,this._min,this._max);this._snapClampSetValue(_)},n=p=>{this._setDraggingStyle(!0),t(p.clientX),window.addEventListener("mousemove",r),window.addEventListener("mouseup",s)},r=p=>{t(p.clientX)},s=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("mousemove",r),window.removeEventListener("mouseup",s)};let a=!1,o,l;const c=p=>{p.preventDefault(),this._setDraggingStyle(!0),t(p.touches[0].clientX),a=!1},h=p=>{p.touches.length>1||(this._hasScrollBar?(o=p.touches[0].clientX,l=p.touches[0].clientY,a=!0):c(p),window.addEventListener("touchmove",u,{passive:!1}),window.addEventListener("touchend",d))},u=p=>{if(a){const v=p.touches[0].clientX-o,_=p.touches[0].clientY-l;Math.abs(v)>Math.abs(_)?c(p):(window.removeEventListener("touchmove",u),window.removeEventListener("touchend",d))}else p.preventDefault(),t(p.touches[0].clientX)},d=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("touchmove",u),window.removeEventListener("touchend",d)},f=this._callOnFinishChange.bind(this),g=400;let x;const m=p=>{if(Math.abs(p.deltaX)<Math.abs(p.deltaY)&&this._hasScrollBar)return;p.preventDefault();const _=this._normalizeMouseWheel(p)*this._step;this._snapClampSetValue(this.getValue()+_),this.$input.value=this.getValue(),clearTimeout(x),x=setTimeout(f,g)};this.$slider.addEventListener("mousedown",n),this.$slider.addEventListener("touchstart",h,{passive:!1}),this.$slider.addEventListener("wheel",m,{passive:!1})}_setDraggingStyle(e,t="horizontal"){this.$slider&&this.$slider.classList.toggle("active",e),document.body.classList.toggle("lil-gui-dragging",e),document.body.classList.toggle(`lil-gui-${t}`,e)}_getImplicitStep(){return this._hasMin&&this._hasMax?(this._max-this._min)/1e3:.1}_onUpdateMinMax(){!this._hasSlider&&this._hasMin&&this._hasMax&&(this._stepExplicit||this.step(this._getImplicitStep(),!1),this._initSlider(),this.updateDisplay())}_normalizeMouseWheel(e){let{deltaX:t,deltaY:n}=e;return Math.floor(e.deltaY)!==e.deltaY&&e.wheelDelta&&(t=0,n=-e.wheelDelta/120,n*=this._stepExplicit?1:10),t+-n}_arrowKeyMultiplier(e){let t=this._stepExplicit?1:10;return e.shiftKey?t*=10:e.altKey&&(t/=10),t}_snap(e){const t=Math.round(e/this._step)*this._step;return parseFloat(t.toPrecision(15))}_clamp(e){return e<this._min&&(e=this._min),e>this._max&&(e=this._max),e}_snapClampSetValue(e){this.setValue(this._clamp(this._snap(e)))}get _hasScrollBar(){const e=this.parent.root.$children;return e.scrollHeight>e.clientHeight}get _hasMin(){return this._min!==void 0}get _hasMax(){return this._max!==void 0}}class f0 extends _n{constructor(e,t,n,r){super(e,t,n,"option"),this.$select=document.createElement("select"),this.$select.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("display"),this.$select.addEventListener("change",()=>{this.setValue(this._values[this.$select.selectedIndex]),this._callOnFinishChange()}),this.$select.addEventListener("focus",()=>{this.$display.classList.add("focus")}),this.$select.addEventListener("blur",()=>{this.$display.classList.remove("focus")}),this.$widget.appendChild(this.$select),this.$widget.appendChild(this.$display),this.$disable=this.$select,this.options(r)}options(e){return this._values=Array.isArray(e)?e:Object.values(e),this._names=Array.isArray(e)?e:Object.keys(e),this.$select.replaceChildren(),this._names.forEach(t=>{const n=document.createElement("option");n.textContent=t,this.$select.appendChild(n)}),this.updateDisplay(),this}updateDisplay(){const e=this.getValue(),t=this._values.indexOf(e);return this.$select.selectedIndex=t,this.$display.textContent=t===-1?e:this._names[t],this}}class p0 extends _n{constructor(e,t,n){super(e,t,n,"string"),this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("spellcheck","false"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$input.addEventListener("input",()=>{this.setValue(this.$input.value)}),this.$input.addEventListener("keydown",r=>{r.code==="Enter"&&this.$input.blur()}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$widget.appendChild(this.$input),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.value=this.getValue(),this}}const m0=`.lil-gui {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  text-align: left;
  color: var(--text-color);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  --background-color: #1f1f1f;
  --text-color: #ebebeb;
  --title-background-color: #111111;
  --title-text-color: #ebebeb;
  --widget-color: #424242;
  --hover-color: #4f4f4f;
  --focus-color: #595959;
  --number-color: #2cc9ff;
  --string-color: #a2db3c;
  --font-size: 11px;
  --input-font-size: 11px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --padding: 4px;
  --spacing: 4px;
  --widget-height: 20px;
  --title-height: calc(var(--widget-height) + var(--spacing) * 1.25);
  --name-width: 45%;
  --slider-knob-width: 2px;
  --slider-input-width: 27%;
  --color-input-width: 27%;
  --slider-input-min-width: 45px;
  --color-input-min-width: 45px;
  --folder-indent: 7px;
  --widget-padding: 0 0 0 3px;
  --widget-border-radius: 2px;
  --checkbox-size: calc(0.75 * var(--widget-height));
  --scrollbar-width: 5px;
}
.lil-gui, .lil-gui * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.lil-gui.root {
  width: var(--width, 245px);
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}
.lil-gui.root > .title {
  background: var(--title-background-color);
  color: var(--title-text-color);
}
.lil-gui.root > .children {
  overflow-x: hidden;
  overflow-y: auto;
}
.lil-gui.root > .children::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background: var(--background-color);
}
.lil-gui.root > .children::-webkit-scrollbar-thumb {
  border-radius: var(--scrollbar-width);
  background: var(--focus-color);
}
@media (pointer: coarse) {
  .lil-gui.allow-touch-styles, .lil-gui.allow-touch-styles .lil-gui {
    --widget-height: 28px;
    --padding: 6px;
    --spacing: 6px;
    --font-size: 13px;
    --input-font-size: 16px;
    --folder-indent: 10px;
    --scrollbar-width: 7px;
    --slider-input-min-width: 50px;
    --color-input-min-width: 65px;
  }
}
.lil-gui.force-touch-styles, .lil-gui.force-touch-styles .lil-gui {
  --widget-height: 28px;
  --padding: 6px;
  --spacing: 6px;
  --font-size: 13px;
  --input-font-size: 16px;
  --folder-indent: 10px;
  --scrollbar-width: 7px;
  --slider-input-min-width: 50px;
  --color-input-min-width: 65px;
}
.lil-gui.autoPlace {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 1001;
}

.lil-gui .controller {
  display: flex;
  align-items: center;
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
}
.lil-gui .controller.disabled {
  opacity: 0.5;
}
.lil-gui .controller.disabled, .lil-gui .controller.disabled * {
  pointer-events: none !important;
}
.lil-gui .controller > .name {
  min-width: var(--name-width);
  flex-shrink: 0;
  white-space: pre;
  padding-right: var(--spacing);
  line-height: var(--widget-height);
}
.lil-gui .controller .widget {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--widget-height);
}
.lil-gui .controller.string input {
  color: var(--string-color);
}
.lil-gui .controller.boolean {
  cursor: pointer;
}
.lil-gui .controller.color .display {
  width: 100%;
  height: var(--widget-height);
  border-radius: var(--widget-border-radius);
  position: relative;
}
@media (hover: hover) {
  .lil-gui .controller.color .display:hover:before {
    content: " ";
    display: block;
    position: absolute;
    border-radius: var(--widget-border-radius);
    border: 1px solid #fff9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
.lil-gui .controller.color input[type=color] {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.lil-gui .controller.color input[type=text] {
  margin-left: var(--spacing);
  font-family: var(--font-family-mono);
  min-width: var(--color-input-min-width);
  width: var(--color-input-width);
  flex-shrink: 0;
}
.lil-gui .controller.option select {
  opacity: 0;
  position: absolute;
  width: 100%;
  max-width: 100%;
}
.lil-gui .controller.option .display {
  position: relative;
  pointer-events: none;
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  line-height: var(--widget-height);
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  padding-left: 0.55em;
  padding-right: 1.75em;
  background: var(--widget-color);
}
@media (hover: hover) {
  .lil-gui .controller.option .display.focus {
    background: var(--focus-color);
  }
}
.lil-gui .controller.option .display.active {
  background: var(--focus-color);
}
.lil-gui .controller.option .display:after {
  font-family: "lil-gui";
  content: "↕";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding-right: 0.375em;
}
.lil-gui .controller.option .widget,
.lil-gui .controller.option select {
  cursor: pointer;
}
@media (hover: hover) {
  .lil-gui .controller.option .widget:hover .display {
    background: var(--hover-color);
  }
}
.lil-gui .controller.number input {
  color: var(--number-color);
}
.lil-gui .controller.number.hasSlider input {
  margin-left: var(--spacing);
  width: var(--slider-input-width);
  min-width: var(--slider-input-min-width);
  flex-shrink: 0;
}
.lil-gui .controller.number .slider {
  width: 100%;
  height: var(--widget-height);
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  padding-right: var(--slider-knob-width);
  overflow: hidden;
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (hover: hover) {
  .lil-gui .controller.number .slider:hover {
    background: var(--hover-color);
  }
}
.lil-gui .controller.number .slider.active {
  background: var(--focus-color);
}
.lil-gui .controller.number .slider.active .fill {
  opacity: 0.95;
}
.lil-gui .controller.number .fill {
  height: 100%;
  border-right: var(--slider-knob-width) solid var(--number-color);
  box-sizing: content-box;
}

.lil-gui-dragging .lil-gui {
  --hover-color: var(--widget-color);
}
.lil-gui-dragging * {
  cursor: ew-resize !important;
}

.lil-gui-dragging.lil-gui-vertical * {
  cursor: ns-resize !important;
}

.lil-gui .title {
  height: var(--title-height);
  line-height: calc(var(--title-height) - 4px);
  font-weight: 600;
  padding: 0 var(--padding);
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  outline: none;
  text-decoration-skip: objects;
}
.lil-gui .title:before {
  font-family: "lil-gui";
  content: "▾";
  padding-right: 2px;
  display: inline-block;
}
.lil-gui .title:active {
  background: var(--title-background-color);
  opacity: 0.75;
}
@media (hover: hover) {
  body:not(.lil-gui-dragging) .lil-gui .title:hover {
    background: var(--title-background-color);
    opacity: 0.85;
  }
  .lil-gui .title:focus {
    text-decoration: underline var(--focus-color);
  }
}
.lil-gui.root > .title:focus {
  text-decoration: none !important;
}
.lil-gui.closed > .title:before {
  content: "▸";
}
.lil-gui.closed > .children {
  transform: translateY(-7px);
  opacity: 0;
}
.lil-gui.closed:not(.transition) > .children {
  display: none;
}
.lil-gui.transition > .children {
  transition-duration: 300ms;
  transition-property: height, opacity, transform;
  transition-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  overflow: hidden;
  pointer-events: none;
}
.lil-gui .children:empty:before {
  content: "Empty";
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
  display: block;
  height: var(--widget-height);
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.5;
}
.lil-gui.root > .children > .lil-gui > .title {
  border: 0 solid var(--widget-color);
  border-width: 1px 0;
  transition: border-color 300ms;
}
.lil-gui.root > .children > .lil-gui.closed > .title {
  border-bottom-color: transparent;
}
.lil-gui + .controller {
  border-top: 1px solid var(--widget-color);
  margin-top: 0;
  padding-top: var(--spacing);
}
.lil-gui .lil-gui .lil-gui > .title {
  border: none;
}
.lil-gui .lil-gui .lil-gui > .children {
  border: none;
  margin-left: var(--folder-indent);
  border-left: 2px solid var(--widget-color);
}
.lil-gui .lil-gui .controller {
  border: none;
}

.lil-gui label, .lil-gui input, .lil-gui button {
  -webkit-tap-highlight-color: transparent;
}
.lil-gui input {
  border: 0;
  outline: none;
  font-family: var(--font-family);
  font-size: var(--input-font-size);
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  background: var(--widget-color);
  color: var(--text-color);
  width: 100%;
}
@media (hover: hover) {
  .lil-gui input:hover {
    background: var(--hover-color);
  }
  .lil-gui input:active {
    background: var(--focus-color);
  }
}
.lil-gui input:disabled {
  opacity: 1;
}
.lil-gui input[type=text],
.lil-gui input[type=number] {
  padding: var(--widget-padding);
  -moz-appearance: textfield;
}
.lil-gui input[type=text]:focus,
.lil-gui input[type=number]:focus {
  background: var(--focus-color);
}
.lil-gui input[type=checkbox] {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--widget-border-radius);
  text-align: center;
  cursor: pointer;
}
.lil-gui input[type=checkbox]:checked:before {
  font-family: "lil-gui";
  content: "✓";
  font-size: var(--checkbox-size);
  line-height: var(--checkbox-size);
}
@media (hover: hover) {
  .lil-gui input[type=checkbox]:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button {
  outline: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-color);
  width: 100%;
  height: var(--widget-height);
  text-transform: none;
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  border: none;
}
@media (hover: hover) {
  .lil-gui button:hover {
    background: var(--hover-color);
  }
  .lil-gui button:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button:active {
  background: var(--focus-color);
}

@font-face {
  font-family: "lil-gui";
  src: url("data:application/font-woff;charset=utf-8;base64,d09GRgABAAAAAAUsAAsAAAAACJwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABHU1VCAAABCAAAAH4AAADAImwmYE9TLzIAAAGIAAAAPwAAAGBKqH5SY21hcAAAAcgAAAD0AAACrukyyJBnbHlmAAACvAAAAF8AAACEIZpWH2hlYWQAAAMcAAAAJwAAADZfcj2zaGhlYQAAA0QAAAAYAAAAJAC5AHhobXR4AAADXAAAABAAAABMAZAAAGxvY2EAAANsAAAAFAAAACgCEgIybWF4cAAAA4AAAAAeAAAAIAEfABJuYW1lAAADoAAAASIAAAIK9SUU/XBvc3QAAATEAAAAZgAAAJCTcMc2eJxVjbEOgjAURU+hFRBK1dGRL+ALnAiToyMLEzFpnPz/eAshwSa97517c/MwwJmeB9kwPl+0cf5+uGPZXsqPu4nvZabcSZldZ6kfyWnomFY/eScKqZNWupKJO6kXN3K9uCVoL7iInPr1X5baXs3tjuMqCtzEuagm/AAlzQgPAAB4nGNgYRBlnMDAysDAYM/gBiT5oLQBAwuDJAMDEwMrMwNWEJDmmsJwgCFeXZghBcjlZMgFCzOiKOIFAB71Bb8AeJy1kjFuwkAQRZ+DwRAwBtNQRUGKQ8OdKCAWUhAgKLhIuAsVSpWz5Bbkj3dEgYiUIszqWdpZe+Z7/wB1oCYmIoboiwiLT2WjKl/jscrHfGg/pKdMkyklC5Zs2LEfHYpjcRoPzme9MWWmk3dWbK9ObkWkikOetJ554fWyoEsmdSlt+uR0pCJR34b6t/TVg1SY3sYvdf8vuiKrpyaDXDISiegp17p7579Gp3p++y7HPAiY9pmTibljrr85qSidtlg4+l25GLCaS8e6rRxNBmsnERunKbaOObRz7N72ju5vdAjYpBXHgJylOAVsMseDAPEP8LYoUHicY2BiAAEfhiAGJgZWBgZ7RnFRdnVJELCQlBSRlATJMoLV2DK4glSYs6ubq5vbKrJLSbGrgEmovDuDJVhe3VzcXFwNLCOILB/C4IuQ1xTn5FPilBTj5FPmBAB4WwoqAHicY2BkYGAA4sk1sR/j+W2+MnAzpDBgAyEMQUCSg4EJxAEAwUgFHgB4nGNgZGBgSGFggJMhDIwMqEAYAByHATJ4nGNgAIIUNEwmAABl3AGReJxjYAACIQYlBiMGJ3wQAEcQBEV4nGNgZGBgEGZgY2BiAAEQyQWEDAz/wXwGAAsPATIAAHicXdBNSsNAHAXwl35iA0UQXYnMShfS9GPZA7T7LgIu03SSpkwzYTIt1BN4Ak/gKTyAeCxfw39jZkjymzcvAwmAW/wgwHUEGDb36+jQQ3GXGot79L24jxCP4gHzF/EIr4jEIe7wxhOC3g2TMYy4Q7+Lu/SHuEd/ivt4wJd4wPxbPEKMX3GI5+DJFGaSn4qNzk8mcbKSR6xdXdhSzaOZJGtdapd4vVPbi6rP+cL7TGXOHtXKll4bY1Xl7EGnPtp7Xy2n00zyKLVHfkHBa4IcJ2oD3cgggWvt/V/FbDrUlEUJhTn/0azVWbNTNr0Ens8de1tceK9xZmfB1CPjOmPH4kitmvOubcNpmVTN3oFJyjzCvnmrwhJTzqzVj9jiSX911FjeAAB4nG3HMRKCMBBA0f0giiKi4DU8k0V2GWbIZDOh4PoWWvq6J5V8If9NVNQcaDhyouXMhY4rPTcG7jwYmXhKq8Wz+p762aNaeYXom2n3m2dLTVgsrCgFJ7OTmIkYbwIbC6vIB7WmFfAAAA==") format("woff");
}`;function g0(i){const e=document.createElement("style");e.innerHTML=i;const t=document.querySelector("head link[rel=stylesheet], head style");t?document.head.insertBefore(e,t):document.head.appendChild(e)}let Nc=!1;class Uo{constructor({parent:e,autoPlace:t=e===void 0,container:n,width:r,title:s="Controls",closeFolders:a=!1,injectStyles:o=!0,touchStyles:l=!0}={}){if(this.parent=e,this.root=e?e.root:this,this.children=[],this.controllers=[],this.folders=[],this._closed=!1,this._hidden=!1,this.domElement=document.createElement("div"),this.domElement.classList.add("lil-gui"),this.$title=document.createElement("div"),this.$title.classList.add("title"),this.$title.setAttribute("role","button"),this.$title.setAttribute("aria-expanded",!0),this.$title.setAttribute("tabindex",0),this.$title.addEventListener("click",()=>this.openAnimated(this._closed)),this.$title.addEventListener("keydown",c=>{(c.code==="Enter"||c.code==="Space")&&(c.preventDefault(),this.$title.click())}),this.$title.addEventListener("touchstart",()=>{},{passive:!0}),this.$children=document.createElement("div"),this.$children.classList.add("children"),this.domElement.appendChild(this.$title),this.domElement.appendChild(this.$children),this.title(s),this.parent){this.parent.children.push(this),this.parent.folders.push(this),this.parent.$children.appendChild(this.domElement);return}this.domElement.classList.add("root"),l&&this.domElement.classList.add("allow-touch-styles"),!Nc&&o&&(g0(m0),Nc=!0),n?n.appendChild(this.domElement):t&&(this.domElement.classList.add("autoPlace"),document.body.appendChild(this.domElement)),r&&this.domElement.style.setProperty("--width",r+"px"),this._closeFolders=a}add(e,t,n,r,s){if(Object(n)===n)return new f0(this,e,t,n);const a=e[t];switch(typeof a){case"number":return new d0(this,e,t,n,r,s);case"boolean":return new s0(this,e,t);case"string":return new p0(this,e,t);case"function":return new ka(this,e,t)}console.error(`gui.add failed
	property:`,t,`
	object:`,e,`
	value:`,a)}addColor(e,t,n=1){return new u0(this,e,t,n)}addFolder(e){const t=new Uo({parent:this,title:e});return this.root._closeFolders&&t.close(),t}load(e,t=!0){return e.controllers&&this.controllers.forEach(n=>{n instanceof ka||n._name in e.controllers&&n.load(e.controllers[n._name])}),t&&e.folders&&this.folders.forEach(n=>{n._title in e.folders&&n.load(e.folders[n._title])}),this}save(e=!0){const t={controllers:{},folders:{}};return this.controllers.forEach(n=>{if(!(n instanceof ka)){if(n._name in t.controllers)throw new Error(`Cannot save GUI with duplicate property "${n._name}"`);t.controllers[n._name]=n.save()}}),e&&this.folders.forEach(n=>{if(n._title in t.folders)throw new Error(`Cannot save GUI with duplicate folder "${n._title}"`);t.folders[n._title]=n.save()}),t}open(e=!0){return this._setClosed(!e),this.$title.setAttribute("aria-expanded",!this._closed),this.domElement.classList.toggle("closed",this._closed),this}close(){return this.open(!1)}_setClosed(e){this._closed!==e&&(this._closed=e,this._callOnOpenClose(this))}show(e=!0){return this._hidden=!e,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}openAnimated(e=!0){return this._setClosed(!e),this.$title.setAttribute("aria-expanded",!this._closed),requestAnimationFrame(()=>{const t=this.$children.clientHeight;this.$children.style.height=t+"px",this.domElement.classList.add("transition");const n=s=>{s.target===this.$children&&(this.$children.style.height="",this.domElement.classList.remove("transition"),this.$children.removeEventListener("transitionend",n))};this.$children.addEventListener("transitionend",n);const r=e?this.$children.scrollHeight:0;this.domElement.classList.toggle("closed",!e),requestAnimationFrame(()=>{this.$children.style.height=r+"px"})}),this}title(e){return this._title=e,this.$title.textContent=e,this}reset(e=!0){return(e?this.controllersRecursive():this.controllers).forEach(n=>n.reset()),this}onChange(e){return this._onChange=e,this}_callOnChange(e){this.parent&&this.parent._callOnChange(e),this._onChange!==void 0&&this._onChange.call(this,{object:e.object,property:e.property,value:e.getValue(),controller:e})}onFinishChange(e){return this._onFinishChange=e,this}_callOnFinishChange(e){this.parent&&this.parent._callOnFinishChange(e),this._onFinishChange!==void 0&&this._onFinishChange.call(this,{object:e.object,property:e.property,value:e.getValue(),controller:e})}onOpenClose(e){return this._onOpenClose=e,this}_callOnOpenClose(e){this.parent&&this.parent._callOnOpenClose(e),this._onOpenClose!==void 0&&this._onOpenClose.call(this,e)}destroy(){this.parent&&(this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.folders.splice(this.parent.folders.indexOf(this),1)),this.domElement.parentElement&&this.domElement.parentElement.removeChild(this.domElement),Array.from(this.children).forEach(e=>e.destroy())}controllersRecursive(){let e=Array.from(this.controllers);return this.folders.forEach(t=>{e=e.concat(t.controllersRecursive())}),e}foldersRecursive(){let e=Array.from(this.folders);return this.folders.forEach(t=>{e=e.concat(t.foldersRecursive())}),e}}const Oc=new Map;function _0(i){const e=Oc.get(i);if(e)return e;const t=new Promise((n,r)=>{const s=document.createElement("script");s.src=i,s.async=!0,s.onload=()=>n(),s.onerror=()=>r(new Error(`[soundtrace.js] failed to load glue: ${i}`)),document.head.appendChild(s)});return Oc.set(i,t),t}async function x0(i,e){const t=e.replace(/\/$/,""),n=`${t}/${i}/exaSound.js`;await _0(n);const r=globalThis.ExaSoundModule;if(!r)throw new Error(`[soundtrace.js] ExaSoundModule not found on globalThis after loading ${n}`);return r({locateFile:s=>`${t}/${i}/${s}`,mainScriptUrlOrBlob:n})}function j(i,e,t,n){if(typeof i.cwrap!="function")throw new Error("[soundtrace.js] Module.cwrap not available on ExaSound module");return i.cwrap(e,t,n)}function v0(i){return{exaInit:j(i,"exaInit",null,[]),exaReset:j(i,"exaReset",null,[]),exaGetVersion:j(i,"exaGetVersion",null,["number","number","number"]),exaGetPathTypeCount:j(i,"exaGetPathTypeCount","number",[]),exaGetLastError:j(i,"exaGetLastError","string",[]),exaPropagatorGetGuidePlaneCount:j(i,"exaPropagatorGetGuidePlaneCount","number",["number"]),exaPropagatorGetGuidePlanes:j(i,"exaPropagatorGetGuidePlanes","boolean",["number","number","number"]),exaPropagatorGetMirrorPositionCount:j(i,"exaPropagatorGetMirrorPositionCount","number",["number"]),exaPropagatorGetMirrorPositions:j(i,"exaPropagatorGetMirrorPositions","boolean",["number","number","number"]),exaPropagatorGetProfile:j(i,"exaPropagatorGetProfile","boolean",["number"]),exaUpdatePropagation:j(i,"exaUpdatePropagation","number",["number"]),exaPropagationLoopStart:j(i,"exaPropagationLoopStart","boolean",["number","number"]),exaPropagationLoopStop:j(i,"exaPropagationLoopStop",null,[]),exaNewScene:j(i,"exaNewScene","number",[]),exaDeleteScene:j(i,"exaDeleteScene",null,["number"]),exaTickScene:j(i,"exaTickScene",null,["number","number"]),exaSceneGetObjectCount:j(i,"exaSceneGetObjectCount","number",["number"]),exaSceneAddObject:j(i,"exaSceneAddObject","boolean",["number","number"]),exaSceneRemoveObject:j(i,"exaSceneRemoveObject","boolean",["number","number"]),exaSceneClearObjects:j(i,"exaSceneClearObjects","boolean",["number"]),exaSceneGetSourceCount:j(i,"exaSceneGetSourceCount","boolean",["number","number"]),exaSceneAddSource:j(i,"exaSceneAddSource","boolean",["number","number"]),exaSceneRemoveSource:j(i,"exaSceneRemoveSource","boolean",["number","number"]),exaSceneClearSources:j(i,"exaSceneClearSources","boolean",["number"]),exaSceneGetListenerCount:j(i,"exaSceneGetListenerCount","boolean",["number","number"]),exaSceneAddListener:j(i,"exaSceneAddListener","boolean",["number","number"]),exaSceneRemoveListener:j(i,"exaSceneRemoveListener","boolean",["number","number"]),exaSceneClearListeners:j(i,"exaSceneClearListeners","boolean",["number"]),exaNewObject:j(i,"exaNewObject","number",[]),exaDeleteObject:j(i,"exaDeleteObject",null,["number"]),exaObjectSetUpdateType:j(i,"exaObjectSetUpdateType","boolean",["number","number"]),exaObjectgetUpdateType:j(i,"exaObjectgetUpdateType","number",["number"]),exaObjectGetPosition:j(i,"exaObjectGetPosition","boolean",["number","number","number","number"]),exaObjectSetPosition:j(i,"exaObjectSetPosition","boolean",["number","number","number","number"]),exaObjectGetRotation:j(i,"exaObjectGetRotation","boolean",["number","number","number","number","number"]),exaObjectSetRotation:j(i,"exaObjectSetRotation","boolean",["number","number","number","number","number"]),exaObjectGetScale:j(i,"exaObjectGetScale","boolean",["number","number","number","number"]),exaObjectSetScale:j(i,"exaObjectSetScale","boolean",["number","number","number","number"]),exaObjectGetMesh:j(i,"exaObjectGetMesh","boolean",["number","number"]),exaObjectSetMesh:j(i,"exaObjectSetMesh","boolean",["number","number"]),exaNewMesh:j(i,"exaNewMesh","number",[]),exaDeleteMesh:j(i,"exaDeleteMesh",null,["number"]),exaMeshSetData:j(i,"exaMeshSetData","boolean",["number","number","number","number","number","number","number","number"]),exaGetSoundMesh:j(i,"exaGetSoundMesh","number",["string"]),exaRegisterMesh:j(i,"exaRegisterMesh","boolean",["string","number"]),exaGetSoundMeshVrtsTrisAll:j(i,"exaGetSoundMeshVrtsTrisAll","boolean",["number","number","number"]),exaMeshUpdateVertices:j(i,"exaMeshUpdateVertices","boolean",["number","number","number"]),exaMeshUpdateVerticesAndRefit:j(i,"exaMeshUpdateVerticesAndRefit","boolean",["number","number","number"]),exaMeshRefit:j(i,"exaMeshRefit","boolean",["number"]),exaMeshSetMaterial:j(i,"exaMeshSetMaterial","boolean",["number","number"]),exaMeshSetMaterialRange:j(i,"exaMeshSetMaterialRange","boolean",["number","number","number","number"]),exaIntersectSoundMesh:j(i,"exaIntersectSoundMesh","boolean",["number","number","number"]),exaAddSoundMaterial:j(i,"exaAddSoundMaterial","number",["number"]),exaSetSoundMaterial:j(i,"exaSetSoundMaterial","boolean",["number","number"]),exaNewSoundSource:j(i,"exaNewSoundSource","number",[]),exaDeleteSoundSource:j(i,"exaDeleteSoundSource",null,["number"]),exaSoundSourceGetPosition:j(i,"exaSoundSourceGetPosition","boolean",["number","number","number","number"]),exaSoundSourceSetPosition:j(i,"exaSoundSourceSetPosition","boolean",["number","number","number","number"]),exaSoundSourceGetDirection:j(i,"exaSoundSourceGetDirection","boolean",["number","number","number","number"]),exaSoundSourceSetDirection:j(i,"exaSoundSourceSetDirection","boolean",["number","number","number","number"]),exaSoundSourceGetVelocity:j(i,"exaSoundSourceGetVelocity","boolean",["number","number","number","number"]),exaSoundSourceSetVelocity:j(i,"exaSoundSourceSetVelocity","boolean",["number","number","number","number"]),exaSoundSourceSetIntensity:j(i,"exaSoundSourceSetIntensity","boolean",["number","number"]),exaSoundSourceGetIntensity:j(i,"exaSoundSourceGetIntensity","boolean",["number","number"]),exaSoundSourceSetGainBoostDb:j(i,"exaSoundSourceSetGainBoostDb","boolean",["number","number"]),exaSoundSourceGetGainBoostDb:j(i,"exaSoundSourceGetGainBoostDb","boolean",["number","number"]),exaSoundSourceSetReverbSendDb:j(i,"exaSoundSourceSetReverbSendDb","boolean",["number","number"]),exaSoundSourceGetReverbSendDb:j(i,"exaSoundSourceGetReverbSendDb","boolean",["number","number"]),exaSoundSourceSetReflectionSendDb:j(i,"exaSoundSourceSetReflectionSendDb","boolean",["number","number"]),exaSoundSourceGetReflectionSendDb:j(i,"exaSoundSourceGetReflectionSendDb","boolean",["number","number"]),exaSoundSourceSetDepth:j(i,"exaSoundSourceSetDepth","boolean",["number","number"]),exaSoundSourceGetDepth:j(i,"exaSoundSourceGetDepth","boolean",["number"]),exaSoundSourceSetRayCount:j(i,"exaSoundSourceSetRayCount","boolean",["number","number","number"]),exaSoundSourceGetRayCount:j(i,"exaSoundSourceGetRayCount","boolean",["number","number","number"]),exaSoundSourceGetDistanceAttenuation:j(i,"exaSoundSourceGetDistanceAttenuation","boolean",["number","number","number"]),exaSoundSourceSetDistanceAttenuation:j(i,"exaSoundSourceSetDistanceAttenuation","boolean",["number","number","number"]),exaSoundSourceSetDistanceAttenuations:j(i,"exaSoundSourceSetDistanceAttenuations","boolean",["number","number","number","number","number"]),exaRenderSound:j(i,"exaRenderSound","boolean",["number","number","number","number","number","number"]),exaSetMaxDelay:j(i,"exaSetMaxDelay","boolean",["number","number","number"]),exaSetPathFadeTime:j(i,"exaSetPathFadeTime","boolean",["number","number","number"]),exaSetMaxDelayRate:j(i,"exaSetMaxDelayRate","boolean",["number","number","number"]),exaGetStatistics:j(i,"exaGetStatistics","boolean",["number","number","number","number"]),exaListenerClearRenderState:j(i,"exaListenerClearRenderState","boolean",["number"]),exaSetMemoryTraceOption:j(i,"exaSetMemoryTraceOption","boolean",["number"]),exaMemoryTraceMark:j(i,"exaMemoryTraceMark","boolean",["string"]),exaGetMemoryTraceSnapshot:j(i,"exaGetMemoryTraceSnapshot","boolean",["number"]),exaStatistics_GetRayTraversalCount:j(i,"exaStatistics_GetRayTraversalCount","number",["number"]),exaStatistics_GetRayTraversals:j(i,"exaStatistics_GetRayTraversals","boolean",["number","number","number"]),exaStatistics_GetRayHitTriangleCount:j(i,"exaStatistics_GetRayHitTriangleCount","number",["number"]),exaStatistics_GetRayHitTriangles:j(i,"exaStatistics_GetRayHitTriangles","boolean",["number","number","number"]),exaGetSortedIRDatas:j(i,"exaGetSortedIRDatas","boolean",[]),exaGetValidPathCount:j(i,"exaGetValidPathCount","number",[]),exaGetValidPaths:j(i,"exaGetValidPaths","number",["number","number"]),exaFindAttenuationForDistance:j(i,"exaFindAttenuationForDistance","number",["number","number","number","number"]),exaTestRayGeneration:j(i,"exaTestRayGeneration",null,["number","number","number"]),exaNewListener:j(i,"exaNewListener","number",[]),exaDeleteListener:j(i,"exaDeleteListener",null,["number"]),exaListenerGetTransform:j(i,"exaListenerGetTransform","boolean",["number","number"]),exaListenerSetTransform:j(i,"exaListenerSetTransform","boolean",["number","number"]),exaListenerGetPosition:j(i,"exaListenerGetPosition","boolean",["number","number"]),exaListenerSetPosition:j(i,"exaListenerSetPosition","boolean",["number","number"]),exaListenerGetVelocity:j(i,"exaListenerGetVelocity","boolean",["number","number"]),exaListenerSetVelocity:j(i,"exaListenerSetVelocity","boolean",["number","number"]),exaListenerSetOrientation:j(i,"exaListenerSetOrientation","boolean",["number","number"]),exaListenerSetOrientation_Quaternion:j(i,"exaListenerSetOrientation_Quaternion","boolean",["number","number","number","number","number"]),exaListenerGetOption:j(i,"exaListenerGetOption","boolean",["number","number"]),exaListenerSetOption:j(i,"exaListenerSetOption","boolean",["number","number"]),exaListenerGetAudioOption:j(i,"exaListenerGetAudioOption","boolean",["number","number"]),exaListenerSetAudioOption:j(i,"exaListenerSetAudioOption","boolean",["number","number"]),exaListenerSetPathEnable:j(i,"exaListenerSetPathEnable","boolean",["number","number","boolean"]),exaListenerIsPathEnabled:j(i,"exaListenerIsPathEnabled","boolean",["number","number","number"]),exaListenerSetRayCount:j(i,"exaListenerSetRayCount","boolean",["number","number","number"]),exaListenerGetRayCount:j(i,"exaListenerGetRayCount","boolean",["number","number","number"]),exaListenerSetRayDepth:j(i,"exaListenerSetRayDepth","boolean",["number","number"]),exaListenerGetRayDepth:j(i,"exaListenerGetRayDepth","boolean",["number","number"]),exaListenerSetHRTFFromMemory:j(i,"exaListenerSetHRTFFromMemory","boolean",["number","number","number"]),exaListenerSetHRTFFromFile:j(i,"exaListenerSetHRTFFromFile","boolean",["number","string"]),exa_audio_worklet_init:j(i,"exa_audio_worklet_init",null,["number","number","number"]),exa_audio_worklet_create_node:j(i,"exa_audio_worklet_create_node","number",["number","number","number","number"]),exa_audio_worklet_create_mixer_node:j(i,"exa_audio_worklet_create_mixer_node","number",["number","number","number","number","number"])}}class y0{constructor(e){he(this,"mod");this.mod=e}get _u8(){if(!this.mod.HEAPU8)throw new Error("[soundtrace.js] HEAPU8 not available");return this.mod.HEAPU8}get _i32(){const e=this.mod.HEAP32;if(!e)throw new Error("[soundtrace.js] HEAP32 not available");return e}get _u32(){const e=this.mod.HEAPU32;if(!e)throw new Error("[soundtrace.js] HEAPU32 not available");return e}get _f32(){if(!this.mod.HEAPF32)throw new Error("[soundtrace.js] HEAPF32 not available");return this.mod.HEAPF32}get _f64(){const e=this.mod.HEAPF64;if(!e)throw new Error("[soundtrace.js] HEAPF64 not available");return e}malloc(e){const t=this.mod._malloc;if(!t)throw new Error("[soundtrace.js] _malloc not exported");const n=t(e);if(!n)throw new Error(`[soundtrace.js] malloc(${e}) returned 0`);return n}free(e){if(!e)return;const t=this.mod._free;if(!t)throw new Error("[soundtrace.js] _free not exported");t(e)}withScope(e){const t=new S0(this);try{return e(t)}finally{t.disposeAll()}}readI32(e){return this._i32[e>>2]}readU32(e){return this._u32[e>>2]}readF32(e){return this._f32[e>>2]}readF64(e){return this._f64[e>>3]}readU8(e){return this._u8[e]}readBool(e){return this._u8[e]!==0}writeI32(e,t){this._i32[e>>2]=t}writeU32(e,t){this._u32[e>>2]=t}writeF32(e,t){this._f32[e>>2]=t}writeU8(e,t){this._u8[e]=t}writeBool(e,t){this._u8[e]=t?1:0}writeF32Array(e,t){this._f32.set(t,e>>2)}readF32Array(e,t){return this._f32.slice(e>>2,(e>>2)+t)}writeI32Array(e,t){this._i32.set(t,e>>2)}readI32Array(e,t){return this._i32.slice(e>>2,(e>>2)+t)}writeU32Array(e,t){this._u32.set(t,e>>2)}readU32Array(e,t){return this._u32.slice(e>>2,(e>>2)+t)}writeBytes(e,t){this._u8.set(t,e)}readBytes(e,t){return this._u8.slice(e,e+t)}}class S0{constructor(e){he(this,"heap");he(this,"allocs",[]);this.heap=e}alloc(e){const t=this.heap.malloc(e);return this.allocs.push(t),t}i32(e=0){const t=this.alloc(4);return this.heap.writeI32(t,e),t}f32(e=0){const t=this.alloc(4);return this.heap.writeF32(t,e),t}u32(e=0){const t=this.alloc(4);return this.heap.writeU32(t,e),t}bool(e=!1){const t=this.alloc(1);return this.heap.writeBool(t,e),t}block(e,t){const n=this.alloc(e);return t&&t(n),n}disposeAll(){for(const e of this.allocs)this.heap.free(e);this.allocs.length=0}}const Ss=16,b0=9,M0=116,E0=16384,A0=32,T0=32,Bt=12;function Gn(i,e,t){i.writeF32(e+0,t.x),i.writeF32(e+4,t.y),i.writeF32(e+8,t.z)}function Lt(i,e){return{x:i.readF32(e+0),y:i.readF32(e+4),z:i.readF32(e+8)}}const w0=36,ho=28;function R0(i,e,t){Gn(i,e+0,t.origin),Gn(i,e+12,t.dir),i.writeF32(e+24,t.dist)}function kh(i,e){return{origin:Lt(i,e+0),dir:Lt(i,e+12),dist:i.readF32(e+24)}}const C0=88;function P0(i,e){return{ray:kh(i,e+0),hit:i.readBool(e+28),distance:i.readF32(e+32),primIndex:i.readI32(e+36),normal:Lt(i,e+40),v0:Lt(i,e+52),v1:Lt(i,e+64),v2:Lt(i,e+76)}}const Bc=60;function L0(i,e,t){Gn(i,e+0,t.position),i.writeF32Array(e+12,t.rotation),i.writeF32(e+48,t.scale.x),i.writeF32(e+52,t.scale.y),i.writeF32(e+56,t.scale.z)}function I0(i,e){return{position:Lt(i,e+0),rotation:i.readF32Array(e+12,9),scale:{x:i.readF32(e+48),y:i.readF32(e+52),z:i.readF32(e+56)}}}const kc=12;function D0(i,e,t){i.writeU32(e+0,t.sampleRate),i.writeU32(e+4,t.inputSampleCount),i.writeU8(e+8,t.outputChannels)}function U0(i,e){return{sampleRate:i.readU32(e+0),inputSampleCount:i.readU32(e+4),outputChannels:i.readU8(e+8)}}const F0=32;function N0(){return{maxDepth:Ss,listenerWidth:A0,listenerHeight:T0,seedValue:0,maxSoundSource:M0,pathCacheSize:E0,enableEnergyBasedTermination:!1,energyThreshold:.001,samePlaneEpsilonDist:.001,samePlaneEpsilonNormal:.999,guideRayMethod:0}}function O0(){return{...N0(),maxDepth:3,listenerWidth:16,listenerHeight:16}}function B0(i,e,t){i.writeU8(e+0,t.maxDepth),i.writeU8(e+1,t.listenerWidth),i.writeU8(e+2,t.listenerHeight),i.writeU32(e+4,t.seedValue),i.writeU32(e+8,t.maxSoundSource&65535|(t.pathCacheSize&65535)<<16),i.writeBool(e+12,t.enableEnergyBasedTermination),i.writeF32(e+16,t.energyThreshold),i.writeF32(e+20,t.samePlaneEpsilonDist),i.writeF32(e+24,t.samePlaneEpsilonNormal),i.writeU8(e+28,t.guideRayMethod)}const zc=104;function Gc(i,e,t){i.writeF32Array(e+0,t.reflection),i.writeF32Array(e+32,t.absorption),i.writeF32Array(e+64,t.transmission),i.writeF32(e+96,t.scattering),i.writeU32(e+100,t.index)}const zh=16;function k0(i,e,t){for(let n=0;n<t.length;n++){const r=t[n],s=e+n*zh;i.writeU32(s+0,r.a),i.writeU32(s+4,r.b),i.writeU32(s+8,r.c),i.writeU32(s+12,r.materialIndex)}}const Vc=52;function z0(i,e){return{vertices:[Lt(i,e+0),Lt(i,e+12),Lt(i,e+24)],normal:Lt(i,e+36),depth:i.readI32(e+48)}}const Hc=24;function G0(i,e){return{position:Lt(i,e+0),setupPlaneIndex:i.readI32(e+12),depth:i.readI32(e+16),planeType:i.readI32(e+20)}}const V0=64;function H0(i,e){return{initMs:i.readF64(e+0),guideRayMs:i.readF64(e+8),sortPlaneMs:i.readF64(e+16),directPathMs:i.readF64(e+24),reflDiffMs:i.readF64(e+32),totalMs:i.readF64(e+40),reflectionCount:i.readI32(e+48),diffractionCount:i.readI32(e+52),setupPlaneTotal:i.readI32(e+56),setupPlaneDiffraction:i.readI32(e+60)}}const W0=276;function X0(i,e,t){i.writeI32(e+0,t.enabled?1:0),i.writeI32(e+4,t.writeLog?1:0),i.writeI32(e+8,t.writeCsv?1:0),i.writeI32(e+12,t.flushEvery);const n=new TextEncoder().encode(t.csvPath),r=Math.min(n.length,259);i.writeBytes(e+16,n.subarray(0,r)),i.writeU8(e+16+r,0)}const j0=80;function Y0(i,e){const t=[];for(let n=0;n<b0;n++){const r=i.readU32(e+8+n*8),s=i.readU32(e+8+n*8+4);t.push(s*4294967296+r)}return{tagCount:i.readI32(e+0),bytes:t}}const Us=1384;function Gh(i,e){const t=[];for(let c=0;c<Ss+1;c++)t.push(Lt(i,e+c*12));const n=e+204,r=n+4+4+4+4+4+4+4+32,s=r+544,a=s+64,o=[];for(let c=0;c<Ss+1;c++)o.push(i.readF32Array(r+c*32,8));const l=[];for(let c=0;c<Ss;c++)l.push(i.readF32Array(a+c*32,8));return{points:t,maxDepth:i.readI32(n+0),pathKind:i.readI32(n+4),soundSourceIndex:i.readI32(n+8),isDynamic:i.readBool(n+12),totalDistance:i.readF32(n+16),toaMs:i.readF32(n+20),energyAvg:i.readF32(n+24),finalEnergy:i.readF32Array(n+28,8),energyPerBand:o,hitMaterialId:i.readI32Array(s,16),hitAbsorption:l}}class $0{constructor(e,t){he(this,"b");he(this,"h");he(this,"disposed",!1);this.b=e,this.h=t}dispose(){}[Symbol.dispose](){}getVersion(){return this.h.withScope(e=>{const t=e.u32(),n=e.u32(),r=e.u32();return this.b.exaGetVersion(t,n,r),{major:this.h.readU32(t),minor:this.h.readU32(n),revision:this.h.readU32(r)}})}setMemoryTraceOption(e){return this.h.withScope(t=>{const n=t.block(W0);return X0(this.h,n,e),this.b.exaSetMemoryTraceOption(n)})}memoryTraceMark(e){return this.b.exaMemoryTraceMark(e)}getMemoryTraceSnapshot(){return this.h.withScope(e=>{const t=e.block(j0);return this.b.exaGetMemoryTraceSnapshot(t)?Y0(this.h,t):null})}getRayTraversalCount(e){return this.b.exaStatistics_GetRayTraversalCount(e)}getRayTraversals(e,t){const n=Math.min(this.getRayTraversalCount(e),t??Number.MAX_SAFE_INTEGER);return n<=0?[]:this.h.withScope(r=>{const s=r.alloc(n*Us);if(!this.b.exaStatistics_GetRayTraversals(e,s,n))return[];const o=[];for(let l=0;l<n;l++)o.push(Gh(this.h,s+l*Us));return o})}getRayHitTriangleCount(e){return this.b.exaStatistics_GetRayHitTriangleCount(e)}getRayHitTriangleVertices(e,t){const n=Math.min(this.getRayHitTriangleCount(e),t??Number.MAX_SAFE_INTEGER);return n<=0?[]:this.h.withScope(r=>{const s=r.alloc(n*Bt);if(!this.b.exaStatistics_GetRayHitTriangles(e,s,n))return[];const o=[];for(let l=0;l<n;l++)o.push(Lt(this.h,s+l*Bt));return o})}testRayGeneration(e,t){const n=e*t;return this.h.withScope(r=>{const s=r.alloc(n*ho);this.b.exaTestRayGeneration(s,e,t);const a=[];for(let o=0;o<n;o++)a.push(kh(this.h,s+o*ho));return a})}getLastError(){return this.b.exaGetLastError()}}class q0{constructor(e,t){he(this,"b");he(this,"h");he(this,"disposed",!1);this.b=e,this.h=t}dispose(){}[Symbol.dispose](){}add(e){return this.h.withScope(t=>{const n=t.block(zc);return Gc(this.h,n,e),this.b.exaAddSoundMaterial(n)})}set(e,t){return this.h.withScope(n=>{const r=n.block(zc);return Gc(this.h,r,t),this.b.exaSetSoundMaterial(e,r)})}}class K0{constructor(e,t){he(this,"b");he(this,"h");he(this,"disposed",!1);this.b=e,this.h=t}dispose(){}[Symbol.dispose](){}getGuidePlaneCount(e){return this.b.exaPropagatorGetGuidePlaneCount(e)}getGuidePlanes(e,t){const n=Math.min(this.getGuidePlaneCount(e),t??Number.MAX_SAFE_INTEGER);return n<=0?[]:this.h.withScope(r=>{const s=r.alloc(n*Vc);if(!this.b.exaPropagatorGetGuidePlanes(e,s,n))return[];const o=[];for(let l=0;l<n;l++)o.push(z0(this.h,s+l*Vc));return o})}getMirrorPositionCount(e){return this.b.exaPropagatorGetMirrorPositionCount(e)}getMirrorPositions(e,t){const n=Math.min(this.getMirrorPositionCount(e),t??Number.MAX_SAFE_INTEGER);return n<=0?[]:this.h.withScope(r=>{const s=r.alloc(n*Hc);if(!this.b.exaPropagatorGetMirrorPositions(e,s,n))return[];const o=[];for(let l=0;l<n;l++)o.push(G0(this.h,s+l*Hc));return o})}getProfile(){return this.h.withScope(e=>{const t=e.block(V0);return this.b.exaPropagatorGetProfile(t)?H0(this.h,t):null})}getValidPathCount(){return this.b.exaGetValidPathCount()}getValidPaths(e){const t=Math.min(this.getValidPathCount(),e??Number.MAX_SAFE_INTEGER);return t<=0?[]:this.h.withScope(n=>{const r=n.alloc(t*Us),s=this.b.exaGetValidPaths(r,t),a=[];for(let o=0;o<s;o++)a.push(Gh(this.h,r+o*Us));return a})}findAttenuationForDistance(e,t,n,r){return this.b.exaFindAttenuationForDistance(e,t,n,r)}sortIRDatas(){return this.b.exaGetSortedIRDatas()}startBackgroundLoop(e,t=16){return this.b.exaPropagationLoopStart(e,t)}stopBackgroundLoop(){this.b.exaPropagationLoopStop()}}class Z0{constructor(e,t){he(this,"b");he(this,"h");he(this,"id");he(this,"_disposed",!1);he(this,"inPtr",0);he(this,"inBytes",0);he(this,"outPtr",0);he(this,"outBytes",0);this.b=e,this.h=t,this.id=e.exaNewListener()}get disposed(){return this._disposed}setTransform(e){return this.h.withScope(t=>{const n=t.block(Bc);L0(this.h,n,e),this.b.exaListenerSetTransform(this.id,n)}),this}getTransform(){return this.h.withScope(e=>{const t=e.block(Bc);return this.b.exaListenerGetTransform(this.id,t),I0(this.h,t)})}setPosition(e,t,n){return this.h.withScope(r=>{const s=r.block(Bt);this.h.writeF32(s+0,e),this.h.writeF32(s+4,t),this.h.writeF32(s+8,n),this.b.exaListenerSetPosition(this.id,s)}),this}getPosition(){return this.h.withScope(e=>{const t=e.block(Bt);return this.b.exaListenerGetPosition(this.id,t),Lt(this.h,t)})}setVelocity(e,t,n){return this.h.withScope(r=>{const s=r.block(Bt);this.h.writeF32(s+0,e),this.h.writeF32(s+4,t),this.h.writeF32(s+8,n),this.b.exaListenerSetVelocity(this.id,s)}),this}getVelocity(){return this.h.withScope(e=>{const t=e.block(Bt);return this.b.exaListenerGetVelocity(this.id,t),Lt(this.h,t)})}setOrientation(e){return this.h.withScope(t=>{const n=t.block(w0);this.h.writeF32Array(n,e),this.b.exaListenerSetOrientation(this.id,n)}),this}setOrientationQuat(e,t,n,r){return this.b.exaListenerSetOrientation_Quaternion(this.id,e,t,n,r),this}setOption(e){return this.h.withScope(t=>{const n=t.block(F0);B0(this.h,n,e),this.b.exaListenerSetOption(this.id,n)}),this}setAudioOption(e){return this.h.withScope(t=>{const n=t.block(kc);D0(this.h,n,e),this.b.exaListenerSetAudioOption(this.id,n)}),this}getAudioOption(){return this.h.withScope(e=>{const t=e.block(kc);return this.b.exaListenerGetAudioOption(this.id,t),U0(this.h,t)})}setPathEnable(e,t){return this.b.exaListenerSetPathEnable(this.id,e,t),this}isPathEnabled(e){return this.h.withScope(t=>{const n=t.bool();return this.b.exaListenerIsPathEnabled(this.id,e,n),this.h.readBool(n)})}setRayCount(e,t){return this.b.exaListenerSetRayCount(this.id,e,t),this}getRayCount(){return this.h.withScope(e=>{const t=e.i32(),n=e.i32();return this.b.exaListenerGetRayCount(this.id,t,n),{width:this.h.readI32(t),height:this.h.readI32(n)}})}setRayDepth(e){return this.b.exaListenerSetRayDepth(this.id,e),this}getRayDepth(){return this.h.withScope(e=>{const t=e.i32();return this.b.exaListenerGetRayDepth(this.id,t),this.h.readI32(t)})}setHRTFFromMemory(e){return this.h.withScope(t=>{const n=new Uint8Array(e),r=t.alloc(n.byteLength);return this.h.writeBytes(r,n),this.b.exaListenerSetHRTFFromMemory(this.id,r,n.byteLength)})}setHRTFFromFile(e){return this.b.exaListenerSetHRTFFromFile(this.id,e)}async setHRTFFromUrl(e){const t=await fetch(e);if(!t.ok)throw new Error(`[soundtrace.js] HRTF fetch failed: ${t.status} ${e}`);return this.setHRTFFromMemory(await t.arrayBuffer())}ensureBuffers(e,t){const n=e*4,r=t*4;n>this.inBytes&&(this.inPtr&&this.h.free(this.inPtr),this.inPtr=this.h.malloc(n),this.inBytes=n),r>this.outBytes&&(this.outPtr&&this.h.free(this.outPtr),this.outPtr=this.h.malloc(r),this.outBytes=r)}render(e,t,n,r){const s=t.length;this.ensureBuffers(t.length,n.length),this.h.writeF32Array(this.inPtr,t);const a=this.b.exaRenderSound(this.id,e,this.inPtr,s,r,this.outPtr);return a&&n.set(this.h.readF32Array(this.outPtr,n.length)),a}setMaxDelay(e,t){return this.b.exaSetMaxDelay(this.id,e,t)}setPathFadeTime(e,t){return this.b.exaSetPathFadeTime(this.id,e,t)}setMaxDelayRate(e,t){return this.b.exaSetMaxDelayRate(this.id,e,t)}getStatistics(e,t){return this.h.withScope(n=>{const r=n.alloc(t*4);return this.b.exaGetStatistics(this.id,e,r,t),this.h.readF32Array(r,t)})}clearRenderState(){return this.b.exaListenerClearRenderState(this.id)}dispose(){this._disposed||(this.inPtr&&this.h.free(this.inPtr),this.outPtr&&this.h.free(this.outPtr),this.b.exaDeleteListener(this.id),this._disposed=!0)}[Symbol.dispose](){this.dispose()}}const Wc={HKDtree:0,LBVH:1};class Vh{constructor(e,t){he(this,"b");he(this,"h");he(this,"id");he(this,"_disposed",!1);he(this,"updateVertsPtr",0);he(this,"updateVertsBytes",0);this.b=e,this.h=t,this.id=e.exaNewMesh()}get disposed(){return this._disposed}setData(e,t,n={}){const r=e.length/3;if(!Number.isInteger(r))throw new Error(`[soundtrace.js] vertices.length must be multiple of 3 (got ${e.length})`);const s=n.bvhMaxDepth??24,a=n.primPerLeaf??4,o=n.bvhType??0;return this.h.withScope(l=>{const c=l.alloc(r*Bt);this.h.writeF32Array(c,e);const h=l.alloc(t.length*zh);k0(this.h,h,t);const u=this.b.exaMeshSetData(this.id,c,r,h,t.length,s,a,o);return u&&this.b.exaMeshRefit(this.id),u})}updateVertices(e){const t=e.length/3;if(!Number.isInteger(t))throw new Error(`[soundtrace.js] vertices.length must be multiple of 3 (got ${e.length})`);const n=t*Bt;return n>this.updateVertsBytes&&(this.updateVertsPtr&&this.h.free(this.updateVertsPtr),this.updateVertsPtr=this.h.malloc(n),this.updateVertsBytes=n),this.h.writeF32Array(this.updateVertsPtr,e),this.b.exaMeshUpdateVertices(this.id,this.updateVertsPtr,t)}updateVerticesAndRefit(e){const t=e.length/3;if(!Number.isInteger(t))throw new Error(`[soundtrace.js] vertices.length must be multiple of 3 (got ${e.length})`);const n=t*Bt;return n>this.updateVertsBytes&&(this.updateVertsPtr&&this.h.free(this.updateVertsPtr),this.updateVertsPtr=this.h.malloc(n),this.updateVertsBytes=n),this.h.writeF32Array(this.updateVertsPtr,e),this.b.exaMeshUpdateVerticesAndRefit(this.id,this.updateVertsPtr,t)}refit(){return this.b.exaMeshRefit(this.id)}setMaterial(e){return this.b.exaMeshSetMaterial(this.id,e)}setMaterialRange(e,t,n){return this.b.exaMeshSetMaterialRange(this.id,e,t,n)}getBVHWireframe(){return this.h.withScope(e=>{const t=e.alloc(4),n=e.alloc(4);if(!this.b.exaGetSoundMeshVrtsTrisAll(this.id,t,n))return null;const s=this.h.readU32(t),a=this.h.readU32(n);return!s||a===0?null:this.h.readF32Array(s,a)})}intersect(e,t){return this.h.withScope(n=>{const r=n.block(ho);R0(this.h,r,t);const s=n.block(C0);return this.b.exaIntersectSoundMesh(e,r,s)?P0(this.h,s):null})}dispose(){this._disposed||(this.updateVertsPtr&&this.h.free(this.updateVertsPtr),this.b.exaDeleteMesh(this.id),this._disposed=!0)}[Symbol.dispose](){this.dispose()}}const Nr={Static:0,Refit:1,Rebuild:2};class Hh{constructor(e,t){he(this,"b");he(this,"h");he(this,"id");he(this,"_disposed",!1);this.b=e,this.h=t,this.id=e.exaNewObject()}get disposed(){return this._disposed}setPosition(e,t,n){return this.b.exaObjectSetPosition(this.id,e,t,n),this}setRotationQuat(e,t,n,r){return this.b.exaObjectSetRotation(this.id,e,t,n,r),this}setScale(e,t,n){return this.b.exaObjectSetScale(this.id,e,t,n),this}setMesh(e){return this.b.exaObjectSetMesh(this.id,e),this}setUpdateType(e){return this.b.exaObjectSetUpdateType(this.id,e)}getUpdateType(){return this.b.exaObjectgetUpdateType(this.id)}getPosition(){return this.h.withScope(e=>{const t=e.f32(),n=e.f32(),r=e.f32();return this.b.exaObjectGetPosition(this.id,t,n,r),{x:this.h.readF32(t),y:this.h.readF32(n),z:this.h.readF32(r)}})}getRotationQuat(){return this.h.withScope(e=>{const t=e.f32(),n=e.f32(),r=e.f32(),s=e.f32();return this.b.exaObjectGetRotation(this.id,t,n,r,s),{x:this.h.readF32(t),y:this.h.readF32(n),z:this.h.readF32(r),w:this.h.readF32(s)}})}getScale(){return this.h.withScope(e=>{const t=e.f32(),n=e.f32(),r=e.f32();return this.b.exaObjectGetScale(this.id,t,n,r),{x:this.h.readF32(t),y:this.h.readF32(n),z:this.h.readF32(r)}})}getMesh(){return this.h.withScope(e=>{const t=e.i32();return this.b.exaObjectGetMesh(this.id,t),this.h.readI32(t)})}dispose(){this._disposed||(this.b.exaDeleteObject(this.id),this._disposed=!0)}[Symbol.dispose](){this.dispose()}}class J0{constructor(e,t){he(this,"b");he(this,"h");he(this,"id");he(this,"_disposed",!1);he(this,"listener",null);this.b=e,this.h=t,this.id=e.exaNewScene()}get disposed(){return this._disposed}addObject(e){return this.b.exaSceneAddObject(this.id,e.id),this}removeObject(e){return this.b.exaSceneRemoveObject(this.id,e.id),this}clearObjects(){return this.b.exaSceneClearObjects(this.id)}getObjectCount(){return this.b.exaSceneGetObjectCount(this.id)}addSource(e){return this.b.exaSceneAddSource(this.id,e.id),this}removeSource(e){return this.b.exaSceneRemoveSource(this.id,e.id),this}clearSources(){return this.b.exaSceneClearSources(this.id)}getSourceCount(){return this.h.withScope(e=>{const t=e.u32();return this.b.exaSceneGetSourceCount(this.id,t),this.h.readU32(t)})}addListener(e){var t;if(((t=this.listener)==null?void 0:t.id)===e.id)return this;if(this.listener||this.getListenerCount()>0)throw new Error("[soundtrace.js] SoundScene supports one listener; use setListener() to replace it");return this.b.exaSceneAddListener(this.id,e.id),this.listener=e,this}setListener(e){var t;return((t=this.listener)==null?void 0:t.id)===e.id?this:(this.clearListeners(),this.b.exaSceneAddListener(this.id,e.id),this.listener=e,this)}removeListener(e){var t;return this.b.exaSceneRemoveListener(this.id,e.id),((t=this.listener)==null?void 0:t.id)===e.id&&(this.listener=null),this}clearListeners(){const e=this.b.exaSceneClearListeners(this.id);return e&&(this.listener=null),e}getListenerCount(){return this.h.withScope(e=>{const t=e.u32();return this.b.exaSceneGetListenerCount(this.id,t),this.h.readU32(t)})}tick(e){return this.b.exaTickScene(this.id,e),this}updatePropagation(){return this.b.exaUpdatePropagation(this.id)}update(e){return this.tick(e),this.updatePropagation()}addCollider(e){return e.attach(this),this}removeCollider(e){return e.detach(this),this}dispose(){this._disposed||(this.b.exaDeleteScene(this.id),this._disposed=!0)}[Symbol.dispose](){this.dispose()}}class Q0{constructor(e,t){he(this,"b");he(this,"h");he(this,"id");he(this,"_disposed",!1);this.b=e,this.h=t,this.id=e.exaNewSoundSource()}get disposed(){return this._disposed}setPosition(e,t,n){return this.b.exaSoundSourceSetPosition(this.id,e,t,n),this}getPosition(){return this.h.withScope(e=>{const t=e.f32(),n=e.f32(),r=e.f32();return this.b.exaSoundSourceGetPosition(this.id,t,n,r),{x:this.h.readF32(t),y:this.h.readF32(n),z:this.h.readF32(r)}})}setDirection(e,t,n){return this.b.exaSoundSourceSetDirection(this.id,e,t,n),this}getDirection(){return this.h.withScope(e=>{const t=e.f32(),n=e.f32(),r=e.f32();return this.b.exaSoundSourceGetDirection(this.id,t,n,r),{x:this.h.readF32(t),y:this.h.readF32(n),z:this.h.readF32(r)}})}setVelocity(e,t,n){return this.b.exaSoundSourceSetVelocity(this.id,e,t,n),this}getVelocity(){return this.h.withScope(e=>{const t=e.f32(),n=e.f32(),r=e.f32();return this.b.exaSoundSourceGetVelocity(this.id,t,n,r),{x:this.h.readF32(t),y:this.h.readF32(n),z:this.h.readF32(r)}})}setIntensity(e){return this.b.exaSoundSourceSetIntensity(this.id,e),this}getIntensity(){return this.h.withScope(e=>{const t=e.f32();return this.b.exaSoundSourceGetIntensity(this.id,t),this.h.readF32(t)})}setGainBoostDb(e){return this.b.exaSoundSourceSetGainBoostDb(this.id,e),this}getGainBoostDb(){return this.h.withScope(e=>{const t=e.f32();return this.b.exaSoundSourceGetGainBoostDb(this.id,t),this.h.readF32(t)})}setReverbSendDb(e){return this.b.exaSoundSourceSetReverbSendDb(this.id,e),this}getReverbSendDb(){return this.h.withScope(e=>{const t=e.f32();return this.b.exaSoundSourceGetReverbSendDb(this.id,t),this.h.readF32(t)})}setReflectionSendDb(e){return this.b.exaSoundSourceSetReflectionSendDb(this.id,e),this}getReflectionSendDb(){return this.h.withScope(e=>{const t=e.f32();return this.b.exaSoundSourceGetReflectionSendDb(this.id,t),this.h.readF32(t)})}setDepth(e){return this.b.exaSoundSourceSetDepth(this.id,e),this}getDepthOk(){return this.b.exaSoundSourceGetDepth(this.id)}setRayCount(e,t){return this.b.exaSoundSourceSetRayCount(this.id,e,t),this}getRayCount(){return this.h.withScope(e=>{const t=e.i32(),n=e.i32();return this.b.exaSoundSourceGetRayCount(this.id,t,n),{width:this.h.readI32(t),height:this.h.readI32(n)}})}getDistanceAttenuation(e){return this.h.withScope(t=>{const n=t.block(Bt);return this.b.exaSoundSourceGetDistanceAttenuation(this.id,e,n),{x:this.h.readF32(n),y:this.h.readF32(n+4),z:this.h.readF32(n+8)}})}setDistanceAttenuation(e,t){return this.h.withScope(n=>{const r=n.block(Bt);Gn(this.h,r,t),this.b.exaSoundSourceSetDistanceAttenuation(this.id,e,r)}),this}setAllDistanceAttenuations(e,t,n,r){return this.h.withScope(s=>{const a=s.block(Bt);Gn(this.h,a,e);const o=s.block(Bt);Gn(this.h,o,t);const l=s.block(Bt);Gn(this.h,l,n);const c=s.block(Bt);Gn(this.h,c,r),this.b.exaSoundSourceSetDistanceAttenuations(this.id,a,o,l,c)}),this}dispose(){this._disposed||(this.b.exaDeleteSoundSource(this.id),this._disposed=!0)}[Symbol.dispose](){this.dispose()}}class ev{constructor(e,t,n={}){he(this,"mesh");he(this,"object");he(this,"scene",null);he(this,"_disposed",!1);this.mesh=new Vh(e,t),this.object=new Hh(e,t).setMesh(this.mesh.id),n.vertices&&n.triangles&&this.rebuild(n.vertices,n.triangles,n)}get id(){return this.object.id}get meshId(){return this.mesh.id}get disposed(){return this._disposed}attach(e){return this.assertLive(),this.scene===e?this:(this.detach(),e.addObject(this.object),this.scene=e,this)}detach(e){return e&&this.scene!==e?this:(this.scene&&(this.scene.removeObject(this.object),this.scene=null),this)}rebuild(e,t,n={}){this.assertLive();const r=this.mesh.setData(e,t,n);return r&&this.object.setUpdateType(Nr.Rebuild),r}refitVertices(e){this.assertLive();const t=this.mesh.updateVerticesAndRefit(e);return t&&this.object.setUpdateType(Nr.Refit),t}setUpdateType(e){return this.assertLive(),this.object.setUpdateType(e)}dispose(){this._disposed||(this.detach(),this.object.dispose(),this.mesh.dispose(),this._disposed=!0)}[Symbol.dispose](){this.dispose()}assertLive(){if(this._disposed)throw new Error("[soundtrace.js] SoundCollider is disposed")}}function tv(i,e={}){var u,d;const t=e.includeInvisible??!0,n=nv(i,t);if(n.length===0)throw new Error("[soundtrace.js] createColliderFromThree expected a BufferGeometry, Mesh, or Object3D with mesh children");const r=[],s=[];for(const f of n){const g=f.geometry,x=iv(g);if(!x||x.count<=0)continue;const m=r.length/3,p=(u=f.matrixWorld)==null?void 0:u.elements;for(let C=0;C<x.count;C++){const w=Xh(x,C),T=rv(x,C),D=sv(x,C);p?av(r,w,T,D,p):r.push(w,T,D)}const v=((d=g.getIndex)==null?void 0:d.call(g))??g.index??null,_=(v==null?void 0:v.count)??x.count,b=g.groups&&g.groups.length>0?g.groups:[{start:0,count:_,materialIndex:0}];for(const C of b){const w=Math.max(0,Math.floor(C.start)),T=Math.min(_,w+Math.max(0,Math.floor(C.count))),D=ov(f.material,C.materialIndex??0,f,e);for(let S=w;S+2<T;S+=3)s.push({a:m+za(v,S),b:m+za(v,S+1),c:m+za(v,S+2),materialIndex:D})}}if(r.length===0||s.length===0)throw new Error("[soundtrace.js] createColliderFromThree found no triangle geometry");const{dynamic:a,defaultMaterialIndex:o,includeInvisible:l,materialMap:c,...h}=e;return{vertices:new Float32Array(r),triangles:s,options:{...h,bvhType:h.bvhType??(a?Wc.LBVH:Wc.HKDtree)}}}function nv(i,e){var r;if(Wh(i))return[{geometry:i}];const t=[],n=i;return(r=n.updateMatrixWorld)==null||r.call(n,!0),typeof n.traverse=="function"?(n.traverse(s=>{Xc(s)&&(e||s.visible!==!1)&&t.push(s)}),t):(Xc(i)&&(e||i.visible!==!1)&&t.push(i),t)}function Xc(i){const e=i;return!!(e&&e.geometry&&(e.isMesh===!0||Wh(e.geometry)))}function Wh(i){var t;const e=i;return!!(e&&(typeof e.getAttribute=="function"||(t=e.attributes)!=null&&t.position))}function iv(i){var e,t;return((e=i.getAttribute)==null?void 0:e.call(i,"position"))??((t=i.attributes)==null?void 0:t.position)}function Xh(i,e){var t;return i.getX?i.getX(e):Number(((t=i.array)==null?void 0:t[e*(i.itemSize??3)])??0)}function rv(i,e){var t;return i.getY?i.getY(e):Number(((t=i.array)==null?void 0:t[e*(i.itemSize??3)+1])??0)}function sv(i,e){var t;return i.getZ?i.getZ(e):Number(((t=i.array)==null?void 0:t[e*(i.itemSize??3)+2])??0)}function za(i,e){return i?Math.floor(Xh(i,e)):e}function av(i,e,t,n,r){i.push(Number(r[0])*e+Number(r[4])*t+Number(r[8])*n+Number(r[12]),Number(r[1])*e+Number(r[5])*t+Number(r[9])*n+Number(r[13]),Number(r[2])*e+Number(r[6])*t+Number(r[10])*n+Number(r[14]))}function ov(i,e,t,n){var l;const r=Array.isArray(i)?i:[i],s=r[e]??r[0]??null,a=jc((l=s==null?void 0:s.userData)==null?void 0:l.soundMaterialIndex);if(a!==void 0)return a;const o=jc(s==null?void 0:s.soundMaterialIndex);if(o!==void 0)return o;if(typeof n.materialMap=="function"){const c=n.materialMap(s,e,t);if(typeof c=="number")return c}else if(n.materialMap){const c=lv(n.materialMap,s,e);if(c!==void 0)return c}return n.defaultMaterialIndex??0}function lv(i,e,t){const n=e,r=[t,String(t),`slot:${t}`,n==null?void 0:n.name,n==null?void 0:n.uuid,n==null?void 0:n.type].filter(s=>s!==void 0&&s!=="");for(const s of r)if(i instanceof Map){const a=i.get(s);if(typeof a=="number")return a}else{const a=i[String(s)];if(typeof a=="number")return a}}function jc(i){return typeof i=="number"&&Number.isFinite(i)?i:void 0}class Fo{constructor(e,t={}){he(this,"ctx");he(this,"thread");he(this,"coreBaseUrl");he(this,"module",null);he(this,"_bindings",null);he(this,"_heap",null);he(this,"_output",null);he(this,"_disposed",!1);he(this,"_materials",null);he(this,"_propagator",null);he(this,"_diagnostics",null);he(this,"_ctxHandle",0);he(this,"_workletInitPromise",null);this.ctx=e,this.thread=t.thread??"st",this.coreBaseUrl=t.coreBaseUrl??new URL("./core",import.meta.url).href}static async create(e,t={}){const n=new Fo(e,t);return await n.load(),n}async load(){this.module||(this.module=await x0(this.thread,this.coreBaseUrl),this._heap=new y0(this.module),this._bindings=v0(this.module),this._bindings.exaInit(),this._output=this.ctx.createGain(),this._output.gain.value=1,console.log(`[soundtrace.js] ready (thread=${this.thread})`))}get output(){if(!this._output)throw new Error("[soundtrace.js] not loaded — call load() first");return this._output}get audioContext(){return this.ctx}bindings(){if(!this._bindings)throw new Error("[soundtrace.js] not loaded — call load() first");return this._bindings}heap(){if(!this._heap)throw new Error("[soundtrace.js] not loaded — call load() first");return this._heap}createScene(){return new J0(this.bindings(),this.heap())}createObject(){return new Hh(this.bindings(),this.heap())}createMesh(){return new Vh(this.bindings(),this.heap())}createCollider(e={}){return new ev(this.bindings(),this.heap(),e)}createColliderFromThree(e,t={}){const n=tv(e,t);return this.createCollider({vertices:n.vertices,triangles:n.triangles,...n.options})}createSource(){return new Q0(this.bindings(),this.heap())}createListener(){return new Z0(this.bindings(),this.heap())}get materials(){return this._materials||(this._materials=new q0(this.bindings(),this.heap())),this._materials}get propagator(){return this._propagator||(this._propagator=new K0(this.bindings(),this.heap())),this._propagator}get diagnostics(){return this._diagnostics||(this._diagnostics=new $0(this.bindings(),this.heap())),this._diagnostics}reset(){this.bindings().exaReset()}getPathTypeCount(){return this.bindings().exaGetPathTypeCount()}getLastError(){return this.bindings().exaGetLastError()}registerMeshPath(e,t){return this.bindings().exaRegisterMesh(e,t)}lookupMeshByPath(e){return this.bindings().exaGetSoundMesh(e)}async createWorkletNode(e,t,n=2){await this._ensureWorkletReady();const r=this.bindings().exa_audio_worklet_create_node(this._ctxHandle,e.id,t.id,n);if(!r)throw new Error("[soundtrace.js] exa_audio_worklet_create_node returned 0 — init incomplete or alloc failed");const s=this.audioWorkletNodeFromHandle(r);return s.channelCount=n,s.channelCountMode="explicit",s.channelInterpretation="speakers",s}async createMixerWorkletNode(e,t,n=2){if(t.length===0)throw new Error("[soundtrace.js] createMixerWorkletNode requires at least one source");await this._ensureWorkletReady();const r=this.heap(),s=t.map(l=>l.id),a=r.withScope(l=>{const c=l.alloc(s.length*4);return r.writeU32Array(c,s),this.bindings().exa_audio_worklet_create_mixer_node(this._ctxHandle,e.id,c,s.length,n)});if(!a)throw new Error("[soundtrace.js] exa_audio_worklet_create_mixer_node returned 0 — init incomplete or alloc failed");const o=this.audioWorkletNodeFromHandle(a);return o.channelCount=n,o.channelCountMode="explicit",o.channelInterpretation="speakers",o}audioWorkletNodeFromHandle(e){const t=this.requireModule();if(!t.emscriptenGetAudioObject)throw new Error("[soundtrace.js] emscriptenGetAudioObject not exported (build missing -sAUDIO_WORKLET=1)");const n=t.emscriptenGetAudioObject(e);if(!(n instanceof AudioWorkletNode))throw new Error(`[soundtrace.js] unexpected object type for worklet node handle ${e}`);return n}_ensureWorkletReady(){return this._workletInitPromise?this._workletInitPromise:(this._workletInitPromise=this._bootstrapWorklet(),this._workletInitPromise)}_bootstrapWorklet(){const e=this.requireModule();return e.emscriptenRegisterAudioObject?!e.addFunction||!e.removeFunction?Promise.reject(new Error("[soundtrace.js] addFunction/removeFunction not exported (build missing -sALLOW_TABLE_GROWTH=1)")):(this._ctxHandle=e.emscriptenRegisterAudioObject(this.ctx),new Promise((t,n)=>{let r=0,s;const a=()=>{s!==void 0&&clearTimeout(s),r!==0&&e.removeFunction(r)},o=()=>{a(),t()};r=e.addFunction(o,"vi"),s=setTimeout(()=>{a(),n(new Error("[soundtrace.js] audio worklet init timeout (5s). Verify that ctx.resume() was called and the wasm was linked with -sAUDIO_WORKLET=1."))},5e3),this.bindings().exa_audio_worklet_init(this._ctxHandle,r,0)})):Promise.reject(new Error("[soundtrace.js] emscriptenRegisterAudioObject not exported (build missing -sAUDIO_WORKLET=1)"))}requireModule(){if(!this.module)throw new Error("[soundtrace.js] not loaded — call load() first");return this.module}get disposed(){return this._disposed}dispose(){var e;if(!this._disposed){try{(e=this._output)==null||e.disconnect()}catch{}this._output=null,this._materials=null,this._propagator=null,this._diagnostics=null,this._bindings=null,this._heap=null,this.module=null,this._workletInitPromise=null,this._ctxHandle=0,this._disposed=!0}}[Symbol.dispose](){this.dispose()}}var cv=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function hv(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var jh={exports:{}};(function(i,e){(function(t,n){i.exports=n()})(cv,function(){var t=function(){function n(f){return a.appendChild(f.dom),f}function r(f){for(var g=0;g<a.children.length;g++)a.children[g].style.display=g===f?"block":"none";s=f}var s=0,a=document.createElement("div");a.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",a.addEventListener("click",function(f){f.preventDefault(),r(++s%a.children.length)},!1);var o=(performance||Date).now(),l=o,c=0,h=n(new t.Panel("FPS","#0ff","#002")),u=n(new t.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var d=n(new t.Panel("MB","#f08","#201"));return r(0),{REVISION:16,dom:a,addPanel:n,showPanel:r,begin:function(){o=(performance||Date).now()},end:function(){c++;var f=(performance||Date).now();if(u.update(f-o,200),f>l+1e3&&(h.update(1e3*c/(f-l),100),l=f,c=0,d)){var g=performance.memory;d.update(g.usedJSHeapSize/1048576,g.jsHeapSizeLimit/1048576)}return f},update:function(){o=this.end()},domElement:a,setMode:r}};return t.Panel=function(n,r,s){var a=1/0,o=0,l=Math.round,c=l(window.devicePixelRatio||1),h=80*c,u=48*c,d=3*c,f=2*c,g=3*c,x=15*c,m=74*c,p=30*c,v=document.createElement("canvas");v.width=h,v.height=u,v.style.cssText="width:80px;height:48px";var _=v.getContext("2d");return _.font="bold "+9*c+"px Helvetica,Arial,sans-serif",_.textBaseline="top",_.fillStyle=s,_.fillRect(0,0,h,u),_.fillStyle=r,_.fillText(n,d,f),_.fillRect(g,x,m,p),_.fillStyle=s,_.globalAlpha=.9,_.fillRect(g,x,m,p),{dom:v,update:function(b,C){a=Math.min(a,b),o=Math.max(o,b),_.fillStyle=s,_.globalAlpha=1,_.fillRect(0,0,h,x),_.fillStyle=r,_.fillText(l(b)+" "+n+" ("+l(a)+"-"+l(o)+")",d,f),_.drawImage(v,g+c,x,m-c,p,g,x,m-c,p),_.fillRect(g+m-c,x,c,p),_.fillStyle=s,_.globalAlpha=.9,_.fillRect(g+m-c,x,c,l((1-b/C)*p))}}},t})})(jh);var uv=jh.exports;const dv=hv(uv);class fv{constructor(e=document.body,t=1){he(this,"stats");he(this,"el");he(this,"_enabled",!0);this.stats=new dv,this.stats.showPanel(0),this.el=document.createElement("div"),this.el.style.position="fixed",this.el.style.top=`${8*t}px`,this.el.style.left="50%",this.el.style.transform=`translateX(-50%) scale(${t})`,this.el.style.transformOrigin="top center",this.el.style.zIndex="100",this.el.style.pointerEvents="auto",this.stats.dom.style.position="static",this.el.appendChild(this.stats.dom),e.appendChild(this.el)}begin(){this._enabled&&this.stats.begin()}end(){this._enabled&&this.stats.end()}setEnabled(e){this._enabled=e,this.el.style.display=e?"block":"none"}dispose(){this.el.remove()}}const Yh=16,Yc=Yh+1,pv=[1,0,0],mv=[1,1,0],gv=[0,1,1],_v=[1,1,1];function xv(i){switch(i){case 0:return pv;case 1:return mv;case 2:return gv;default:return _v}}class vv{constructor(e){he(this,"material");he(this,"geom");he(this,"lineSegments");he(this,"positions");he(this,"colors");he(this,"posAttr");he(this,"colorAttr");he(this,"_enabled",!0);he(this,"_maxPaths",256);this.material=new Or({vertexColors:!0,transparent:!0,opacity:.9});const t=this._maxPaths*Yc*2;this.positions=new Float32Array(t*3),this.colors=new Float32Array(t*3),this.posAttr=new Ht(this.positions,3),this.colorAttr=new Ht(this.colors,3),this.posAttr.setUsage(Ps),this.colorAttr.setUsage(Ps),this.geom=new It,this.geom.setAttribute("position",this.posAttr),this.geom.setAttribute("color",this.colorAttr),this.geom.setDrawRange(0,0),this.lineSegments=new Ph(this.geom,this.material),this.lineSegments.name="soundtrace.PathGizmo",this.lineSegments.frustumCulled=!1,e.add(this.lineSegments)}setEnabled(e){this._enabled=e,this.lineSegments.visible=e}get enabled(){return this._enabled}setMaxPaths(e){this._maxPaths=Math.max(1,e|0)}update(e,t,n){if(!this._enabled){this.geom.setDrawRange(0,0);return}const r=e.getValidPaths(this._maxPaths),s=this.positions,a=this.colors;let o=0;const l=t.x,c=t.y,h=t.z;for(let u=0;u<r.length;u++){const d=r[u];if(d.maxDepth<=0)continue;const f=n(d.soundSourceIndex);if(!f)continue;const g=Math.min(d.maxDepth,d.points.length,Yh),x=xv(d.pathKind),m=x[0],p=x[1],v=x[2];let _=f.x,b=f.y,C=f.z;for(let w=0;w<g;w++){const T=d.points[w],D=o*3;s[D+0]=_,s[D+1]=b,s[D+2]=C,a[D+0]=m,a[D+1]=p,a[D+2]=v,o++;const S=o*3;s[S+0]=T.x,s[S+1]=T.y,s[S+2]=T.z,a[S+0]=m,a[S+1]=p,a[S+2]=v,o++,_=T.x,b=T.y,C=T.z}{const w=o*3;s[w+0]=_,s[w+1]=b,s[w+2]=C,a[w+0]=m,a[w+1]=p,a[w+2]=v,o++;const T=o*3;s[T+0]=l,s[T+1]=c,s[T+2]=h,a[T+0]=m,a[T+1]=p,a[T+2]=v,o++}if(o+Yc*2>s.length/3)break}this.posAttr.needsUpdate=!0,this.colorAttr.needsUpdate=!0,this.geom.setDrawRange(0,o)}dispose(){this.geom.dispose(),this.material.dispose(),this.lineSegments.removeFromParent()}}const yv=8453888,Ga=36*3,Sv=12*2*3,bv=[[0,1],[1,5],[5,4],[4,0],[3,2],[2,6],[6,7],[7,3],[0,2],[1,3],[5,7],[4,6]];class Mv{constructor(e){he(this,"material");he(this,"geom");he(this,"lineSegments");he(this,"positions");he(this,"posAttr");he(this,"_enabled",!0);this.material=new Or({color:yv,transparent:!0,opacity:.6}),this.positions=new Float32Array(0),this.posAttr=new Ht(this.positions,3),this.posAttr.setUsage(Ps),this.geom=new It,this.geom.setAttribute("position",this.posAttr),this.geom.setDrawRange(0,0),this.lineSegments=new Ph(this.geom,this.material),this.lineSegments.name="soundtrace.BVHGizmo",this.lineSegments.frustumCulled=!1,e.add(this.lineSegments)}setEnabled(e){this._enabled=e,this.lineSegments.visible=e}get enabled(){return this._enabled}update(e){this.updateMany([e])}updateMany(e){if(!this._enabled){this.geom.setDrawRange(0,0);return}const t=e.map(o=>o.getBVHWireframe()).filter(o=>!!(o&&o.length>0));if(t.length===0){this.geom.setDrawRange(0,0);return}const r=t.reduce((o,l)=>o+(l.length/Ga|0),0)*Sv;this.positions.length<r&&(this.positions=new Float32Array(r),this.posAttr=new Ht(this.positions,3),this.posAttr.setUsage(Ps),this.geom.setAttribute("position",this.posAttr));const s=this.positions;let a=0;for(const o of t){const l=o.length/Ga|0;for(let c=0;c<l;c++){const h=c*Ga;let u=1/0,d=1/0,f=1/0,g=-1/0,x=-1/0,m=-1/0;for(let b=0;b<36;b++){const C=o[h+b*3+0],w=o[h+b*3+1],T=o[h+b*3+2];C<u&&(u=C),C>g&&(g=C),w<d&&(d=w),w>x&&(x=w),T<f&&(f=T),T>m&&(m=T)}const p=[u,g],v=[d,x],_=[f,m];for(const[b,C]of bv){const w=p[b&1],T=v[b>>1&1],D=_[b>>2&1],S=p[C&1],A=v[C>>1&1],N=_[C>>2&1];s[a++]=w,s[a++]=T,s[a++]=D,s[a++]=S,s[a++]=A,s[a++]=N}}}this.posAttr.needsUpdate=!0,this.geom.setDrawRange(0,a/3)}clear(){this.geom.setDrawRange(0,0)}dispose(){this.geom.dispose(),this.material.dispose(),this.lineSegments.removeFromParent()}}/*!
fflate - fast JavaScript compression/decompression
<https://101arrowz.github.io/fflate>
Licensed under MIT. https://github.com/101arrowz/fflate/blob/master/LICENSE
version 0.6.9
*/var $c=function(i){return URL.createObjectURL(new Blob([i],{type:"text/javascript"}))};try{URL.revokeObjectURL($c(""))}catch{$c=function(e){return"data:application/javascript;charset=UTF-8,"+encodeURI(e)}}var nn=Uint8Array,Wn=Uint16Array,uo=Uint32Array,$h=new nn([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),qh=new nn([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),Ev=new nn([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Kh=function(i,e){for(var t=new Wn(31),n=0;n<31;++n)t[n]=e+=1<<i[n-1];for(var r=new uo(t[30]),n=1;n<30;++n)for(var s=t[n];s<t[n+1];++s)r[s]=s-t[n]<<5|n;return[t,r]},Zh=Kh($h,2),Jh=Zh[0],Av=Zh[1];Jh[28]=258,Av[258]=28;var Tv=Kh(qh,0),wv=Tv[0],fo=new Wn(32768);for(var it=0;it<32768;++it){var Bn=(it&43690)>>>1|(it&21845)<<1;Bn=(Bn&52428)>>>2|(Bn&13107)<<2,Bn=(Bn&61680)>>>4|(Bn&3855)<<4,fo[it]=((Bn&65280)>>>8|(Bn&255)<<8)>>>1}var Mr=function(i,e,t){for(var n=i.length,r=0,s=new Wn(e);r<n;++r)++s[i[r]-1];var a=new Wn(e);for(r=0;r<e;++r)a[r]=a[r-1]+s[r-1]<<1;var o;if(t){o=new Wn(1<<e);var l=15-e;for(r=0;r<n;++r)if(i[r])for(var c=r<<4|i[r],h=e-i[r],u=a[i[r]-1]++<<h,d=u|(1<<h)-1;u<=d;++u)o[fo[u]>>>l]=c}else for(o=new Wn(n),r=0;r<n;++r)i[r]&&(o[r]=fo[a[i[r]-1]++]>>>15-i[r]);return o},kr=new nn(288);for(var it=0;it<144;++it)kr[it]=8;for(var it=144;it<256;++it)kr[it]=9;for(var it=256;it<280;++it)kr[it]=7;for(var it=280;it<288;++it)kr[it]=8;var Qh=new nn(32);for(var it=0;it<32;++it)Qh[it]=5;var Rv=Mr(kr,9,1),Cv=Mr(Qh,5,1),Va=function(i){for(var e=i[0],t=1;t<i.length;++t)i[t]>e&&(e=i[t]);return e},on=function(i,e,t){var n=e/8|0;return(i[n]|i[n+1]<<8)>>(e&7)&t},Ha=function(i,e){var t=e/8|0;return(i[t]|i[t+1]<<8|i[t+2]<<16)>>(e&7)},Pv=function(i){return(i/8|0)+(i&7&&1)},Lv=function(i,e,t){(t==null||t>i.length)&&(t=i.length);var n=new(i instanceof Wn?Wn:i instanceof uo?uo:nn)(t-e);return n.set(i.subarray(e,t)),n},Iv=function(i,e,t){var n=i.length;if(!n||t&&!t.l&&n<5)return e||new nn(0);var r=!e||t,s=!t||t.i;t||(t={}),e||(e=new nn(n*3));var a=function(_e){var ce=e.length;if(_e>ce){var Me=new nn(Math.max(ce*2,_e));Me.set(e),e=Me}},o=t.f||0,l=t.p||0,c=t.b||0,h=t.l,u=t.d,d=t.m,f=t.n,g=n*8;do{if(!h){t.f=o=on(i,l,1);var x=on(i,l+1,3);if(l+=3,x)if(x==1)h=Rv,u=Cv,d=9,f=5;else if(x==2){var _=on(i,l,31)+257,b=on(i,l+10,15)+4,C=_+on(i,l+5,31)+1;l+=14;for(var w=new nn(C),T=new nn(19),D=0;D<b;++D)T[Ev[D]]=on(i,l+D*3,7);l+=b*3;for(var S=Va(T),A=(1<<S)-1,N=Mr(T,S,1),D=0;D<C;){var W=N[on(i,l,A)];l+=W&15;var m=W>>>4;if(m<16)w[D++]=m;else{var Z=0,I=0;for(m==16?(I=3+on(i,l,3),l+=2,Z=w[D-1]):m==17?(I=3+on(i,l,7),l+=3):m==18&&(I=11+on(i,l,127),l+=7);I--;)w[D++]=Z}}var F=w.subarray(0,_),z=w.subarray(_);d=Va(F),f=Va(z),h=Mr(F,d,1),u=Mr(z,f,1)}else throw"invalid block type";else{var m=Pv(l)+4,p=i[m-4]|i[m-3]<<8,v=m+p;if(v>n){if(s)throw"unexpected EOF";break}r&&a(c+p),e.set(i.subarray(m,v),c),t.b=c+=p,t.p=l=v*8;continue}if(l>g){if(s)throw"unexpected EOF";break}}r&&a(c+131072);for(var $=(1<<d)-1,X=(1<<f)-1,Y=l;;Y=l){var Z=h[Ha(i,l)&$],q=Z>>>4;if(l+=Z&15,l>g){if(s)throw"unexpected EOF";break}if(!Z)throw"invalid length/literal";if(q<256)e[c++]=q;else if(q==256){Y=l,h=null;break}else{var J=q-254;if(q>264){var D=q-257,oe=$h[D];J=on(i,l,(1<<oe)-1)+Jh[D],l+=oe}var V=u[Ha(i,l)&X],K=V>>>4;if(!V)throw"invalid distance";l+=V&15;var z=wv[K];if(K>3){var oe=qh[K];z+=Ha(i,l)&(1<<oe)-1,l+=oe}if(l>g){if(s)throw"unexpected EOF";break}r&&a(c+131072);for(var le=c+J;c<le;c+=4)e[c]=e[c-z],e[c+1]=e[c+1-z],e[c+2]=e[c+2-z],e[c+3]=e[c+3-z];c=le}}t.l=h,t.p=Y,t.b=c,h&&(o=1,t.m=d,t.d=u,t.n=f)}while(!o);return c==e.length?e:Lv(e,0,c)},Dv=new nn(0),Uv=function(i){if((i[0]&15)!=8||i[0]>>>4>7||(i[0]<<8|i[1])%31)throw"invalid zlib data";if(i[1]&32)throw"invalid zlib data: preset dictionaries not supported"};function Fv(i,e){return Iv((Uv(i),i.subarray(2,-4)),e)}var Nv=typeof TextDecoder<"u"&&new TextDecoder,Ov=0;try{Nv.decode(Dv,{stream:!0}),Ov=1}catch{}function eu(i,e,t){const n=t.length-i-1;if(e>=t[n])return n-1;if(e<=t[i])return i;let r=i,s=n,a=Math.floor((r+s)/2);for(;e<t[a]||e>=t[a+1];)e<t[a]?s=a:r=a,a=Math.floor((r+s)/2);return a}function Bv(i,e,t,n){const r=[],s=[],a=[];r[0]=1;for(let o=1;o<=t;++o){s[o]=e-n[i+1-o],a[o]=n[i+o]-e;let l=0;for(let c=0;c<o;++c){const h=a[c+1],u=s[o-c],d=r[c]/(h+u);r[c]=l+h*d,l=u*d}r[o]=l}return r}function kv(i,e,t,n){const r=eu(i,n,e),s=Bv(r,n,i,e),a=new Qe(0,0,0,0);for(let o=0;o<=i;++o){const l=t[r-i+o],c=s[o],h=l.w*c;a.x+=l.x*h,a.y+=l.y*h,a.z+=l.z*h,a.w+=l.w*c}return a}function zv(i,e,t,n,r){const s=[];for(let u=0;u<=t;++u)s[u]=0;const a=[];for(let u=0;u<=n;++u)a[u]=s.slice(0);const o=[];for(let u=0;u<=t;++u)o[u]=s.slice(0);o[0][0]=1;const l=s.slice(0),c=s.slice(0);for(let u=1;u<=t;++u){l[u]=e-r[i+1-u],c[u]=r[i+u]-e;let d=0;for(let f=0;f<u;++f){const g=c[f+1],x=l[u-f];o[u][f]=g+x;const m=o[f][u-1]/o[u][f];o[f][u]=d+g*m,d=x*m}o[u][u]=d}for(let u=0;u<=t;++u)a[0][u]=o[u][t];for(let u=0;u<=t;++u){let d=0,f=1;const g=[];for(let x=0;x<=t;++x)g[x]=s.slice(0);g[0][0]=1;for(let x=1;x<=n;++x){let m=0;const p=u-x,v=t-x;u>=x&&(g[f][0]=g[d][0]/o[v+1][p],m=g[f][0]*o[p][v]);const _=p>=-1?1:-p,b=u-1<=v?x-1:t-u;for(let w=_;w<=b;++w)g[f][w]=(g[d][w]-g[d][w-1])/o[v+1][p+w],m+=g[f][w]*o[p+w][v];u<=v&&(g[f][x]=-g[d][x-1]/o[v+1][u],m+=g[f][x]*o[u][v]),a[x][u]=m;const C=d;d=f,f=C}}let h=t;for(let u=1;u<=n;++u){for(let d=0;d<=t;++d)a[u][d]*=h;h*=t-u}return a}function Gv(i,e,t,n,r){const s=r<i?r:i,a=[],o=eu(i,n,e),l=zv(o,n,i,s,e),c=[];for(let h=0;h<t.length;++h){const u=t[h].clone(),d=u.w;u.x*=d,u.y*=d,u.z*=d,c[h]=u}for(let h=0;h<=s;++h){const u=c[o-i].clone().multiplyScalar(l[h][0]);for(let d=1;d<=i;++d)u.add(c[o-i+d].clone().multiplyScalar(l[h][d]));a[h]=u}for(let h=s+1;h<=r+1;++h)a[h]=new Qe(0,0,0);return a}function Vv(i,e){let t=1;for(let r=2;r<=i;++r)t*=r;let n=1;for(let r=2;r<=e;++r)n*=r;for(let r=2;r<=i-e;++r)n*=r;return t/n}function Hv(i){const e=i.length,t=[],n=[];for(let s=0;s<e;++s){const a=i[s];t[s]=new P(a.x,a.y,a.z),n[s]=a.w}const r=[];for(let s=0;s<e;++s){const a=t[s].clone();for(let o=1;o<=s;++o)a.sub(r[s-o].clone().multiplyScalar(Vv(s,o)*n[o]));r[s]=a.divideScalar(n[0])}return r}function Wv(i,e,t,n,r){const s=Gv(i,e,t,n,r);return Hv(s)}class Xv extends rx{constructor(e,t,n,r,s){super(),this.degree=e,this.knots=t,this.controlPoints=[],this.startKnot=r||0,this.endKnot=s||this.knots.length-1;for(let a=0;a<n.length;++a){const o=n[a];this.controlPoints[a]=new Qe(o.x,o.y,o.z,o.w)}}getPoint(e,t=new P){const n=t,r=this.knots[this.startKnot]+e*(this.knots[this.endKnot]-this.knots[this.startKnot]),s=kv(this.degree,this.knots,this.controlPoints,r);return s.w!==1&&s.divideScalar(s.w),n.set(s.x,s.y,s.z)}getTangent(e,t=new P){const n=t,r=this.knots[0]+e*(this.knots[this.knots.length-1]-this.knots[0]),s=Wv(this.degree,this.knots,this.controlPoints,r,1);return n.copy(s[1]).normalize(),n}}let We,dt,Nt;class jv extends bi{constructor(e){super(e)}load(e,t,n,r){const s=this,a=s.path===""?Vx.extractUrlBase(e):s.path,o=new Dx(this.manager);o.setPath(s.path),o.setResponseType("arraybuffer"),o.setRequestHeader(s.requestHeader),o.setWithCredentials(s.withCredentials),o.load(e,function(l){try{t(s.parse(l,a))}catch(c){r?r(c):console.error(c),s.manager.itemError(e)}},n,r)}parse(e,t){if(Jv(e))We=new Zv().parse(e);else{const r=ru(e);if(!Qv(r))throw new Error("THREE.FBXLoader: Unknown format.");if(Kc(r)<7e3)throw new Error("THREE.FBXLoader: FBX version not supported, FileVersion: "+Kc(r));We=new Kv().parse(r)}const n=new Fx(this.manager).setPath(this.resourcePath||t).setCrossOrigin(this.crossOrigin);return new Yv(n,this.manager).parse(We)}}class Yv{constructor(e,t){this.textureLoader=e,this.manager=t}parse(){dt=this.parseConnections();const e=this.parseImages(),t=this.parseTextures(e),n=this.parseMaterials(t),r=this.parseDeformers(),s=new $v().parse(r);return this.parseScene(r,s,n),Nt}parseConnections(){const e=new Map;return"Connections"in We&&We.Connections.connections.forEach(function(n){const r=n[0],s=n[1],a=n[2];e.has(r)||e.set(r,{parents:[],children:[]});const o={ID:s,relationship:a};e.get(r).parents.push(o),e.has(s)||e.set(s,{parents:[],children:[]});const l={ID:r,relationship:a};e.get(s).children.push(l)}),e}parseImages(){const e={},t={};if("Video"in We.Objects){const n=We.Objects.Video;for(const r in n){const s=n[r],a=parseInt(r);if(e[a]=s.RelativeFilename||s.Filename,"Content"in s){const o=s.Content instanceof ArrayBuffer&&s.Content.byteLength>0,l=typeof s.Content=="string"&&s.Content!=="";if(o||l){const c=this.parseImage(n[r]);t[s.RelativeFilename||s.Filename]=c}}}}for(const n in e){const r=e[n];t[r]!==void 0?e[n]=t[r]:e[n]=e[n].split("\\").pop()}return e}parseImage(e){const t=e.Content,n=e.RelativeFilename||e.Filename,r=n.slice(n.lastIndexOf(".")+1).toLowerCase();let s;switch(r){case"bmp":s="image/bmp";break;case"jpg":case"jpeg":s="image/jpeg";break;case"png":s="image/png";break;case"tif":s="image/tiff";break;case"tga":this.manager.getHandler(".tga")===null&&console.warn("FBXLoader: TGA loader not found, skipping ",n),s="image/tga";break;default:console.warn('FBXLoader: Image type "'+r+'" is not supported.');return}if(typeof t=="string")return"data:"+s+";base64,"+t;{const a=new Uint8Array(t);return window.URL.createObjectURL(new Blob([a],{type:s}))}}parseTextures(e){const t=new Map;if("Texture"in We.Objects){const n=We.Objects.Texture;for(const r in n){const s=this.parseTexture(n[r],e);t.set(parseInt(r),s)}}return t}parseTexture(e,t){const n=this.loadTexture(e,t);n.ID=e.id,n.name=e.attrName;const r=e.WrapModeU,s=e.WrapModeV,a=r!==void 0?r.value:0,o=s!==void 0?s.value:0;if(n.wrapS=a===0?Tr:Yt,n.wrapT=o===0?Tr:Yt,"Scaling"in e){const l=e.Scaling.value;n.repeat.x=l[0],n.repeat.y=l[1]}if("Translation"in e){const l=e.Translation.value;n.offset.x=l[0],n.offset.y=l[1]}return n}loadTexture(e,t){let n;const r=this.textureLoader.path,s=dt.get(e.id).children;s!==void 0&&s.length>0&&t[s[0].ID]!==void 0&&(n=t[s[0].ID],(n.indexOf("blob:")===0||n.indexOf("data:")===0)&&this.textureLoader.setPath(void 0));let a;const o=e.FileName.slice(-3).toLowerCase();if(o==="tga"){const l=this.manager.getHandler(".tga");l===null?(console.warn("FBXLoader: TGA loader not found, creating placeholder texture for",e.RelativeFilename),a=new Mt):(l.setPath(this.textureLoader.path),a=l.load(n))}else if(o==="dds"){const l=this.manager.getHandler(".dds");l===null?(console.warn("FBXLoader: DDS loader not found, creating placeholder texture for",e.RelativeFilename),a=new Mt):(l.setPath(this.textureLoader.path),a=l.load(n))}else o==="psd"?(console.warn("FBXLoader: PSD textures are not supported, creating placeholder texture for",e.RelativeFilename),a=new Mt):a=this.textureLoader.load(n);return this.textureLoader.setPath(r),a}parseMaterials(e){const t=new Map;if("Material"in We.Objects){const n=We.Objects.Material;for(const r in n){const s=this.parseMaterial(n[r],e);s!==null&&t.set(parseInt(r),s)}}return t}parseMaterial(e,t){const n=e.id,r=e.attrName;let s=e.ShadingModel;if(typeof s=="object"&&(s=s.value),!dt.has(n))return null;const a=this.parseParameters(e,t,n);let o;switch(s.toLowerCase()){case"phong":o=new Ua;break;case"lambert":o=new bx;break;default:console.warn('THREE.FBXLoader: unknown material type "%s". Defaulting to MeshPhongMaterial.',s),o=new Ua;break}return o.setValues(a),o.name=r,o}parseParameters(e,t,n){const r={};e.BumpFactor&&(r.bumpScale=e.BumpFactor.value),e.Diffuse?r.color=new Ie().fromArray(e.Diffuse.value).convertSRGBToLinear():e.DiffuseColor&&(e.DiffuseColor.type==="Color"||e.DiffuseColor.type==="ColorRGB")&&(r.color=new Ie().fromArray(e.DiffuseColor.value).convertSRGBToLinear()),e.DisplacementFactor&&(r.displacementScale=e.DisplacementFactor.value),e.Emissive?r.emissive=new Ie().fromArray(e.Emissive.value).convertSRGBToLinear():e.EmissiveColor&&(e.EmissiveColor.type==="Color"||e.EmissiveColor.type==="ColorRGB")&&(r.emissive=new Ie().fromArray(e.EmissiveColor.value).convertSRGBToLinear()),e.EmissiveFactor&&(r.emissiveIntensity=parseFloat(e.EmissiveFactor.value)),e.Opacity&&(r.opacity=parseFloat(e.Opacity.value)),r.opacity<1&&(r.transparent=!0),e.ReflectionFactor&&(r.reflectivity=e.ReflectionFactor.value),e.Shininess&&(r.shininess=e.Shininess.value),e.Specular?r.specular=new Ie().fromArray(e.Specular.value).convertSRGBToLinear():e.SpecularColor&&e.SpecularColor.type==="Color"&&(r.specular=new Ie().fromArray(e.SpecularColor.value).convertSRGBToLinear());const s=this;return dt.get(n).children.forEach(function(a){const o=a.relationship;switch(o){case"Bump":r.bumpMap=s.getTexture(t,a.ID);break;case"Maya|TEX_ao_map":r.aoMap=s.getTexture(t,a.ID);break;case"DiffuseColor":case"Maya|TEX_color_map":r.map=s.getTexture(t,a.ID),r.map!==void 0&&(r.map.colorSpace=ft);break;case"DisplacementColor":r.displacementMap=s.getTexture(t,a.ID);break;case"EmissiveColor":r.emissiveMap=s.getTexture(t,a.ID),r.emissiveMap!==void 0&&(r.emissiveMap.colorSpace=ft);break;case"NormalMap":case"Maya|TEX_normal_map":r.normalMap=s.getTexture(t,a.ID);break;case"ReflectionColor":r.envMap=s.getTexture(t,a.ID),r.envMap!==void 0&&(r.envMap.mapping=Ms,r.envMap.colorSpace=ft);break;case"SpecularColor":r.specularMap=s.getTexture(t,a.ID),r.specularMap!==void 0&&(r.specularMap.colorSpace=ft);break;case"TransparentColor":case"TransparencyFactor":r.alphaMap=s.getTexture(t,a.ID),r.transparent=!0;break;case"AmbientColor":case"ShininessExponent":case"SpecularFactor":case"VectorDisplacementColor":default:console.warn("THREE.FBXLoader: %s map is not supported in three.js, skipping texture.",o);break}}),r}getTexture(e,t){return"LayeredTexture"in We.Objects&&t in We.Objects.LayeredTexture&&(console.warn("THREE.FBXLoader: layered textures are not supported in three.js. Discarding all but first layer."),t=dt.get(t).children[0].ID),e.get(t)}parseDeformers(){const e={},t={};if("Deformer"in We.Objects){const n=We.Objects.Deformer;for(const r in n){const s=n[r],a=dt.get(parseInt(r));if(s.attrType==="Skin"){const o=this.parseSkeleton(a,n);o.ID=r,a.parents.length>1&&console.warn("THREE.FBXLoader: skeleton attached to more than one geometry is not supported."),o.geometryID=a.parents[0].ID,e[r]=o}else if(s.attrType==="BlendShape"){const o={id:r};o.rawTargets=this.parseMorphTargets(a,n),o.id=r,a.parents.length>1&&console.warn("THREE.FBXLoader: morph target attached to more than one geometry is not supported."),t[r]=o}}}return{skeletons:e,morphTargets:t}}parseSkeleton(e,t){const n=[];return e.children.forEach(function(r){const s=t[r.ID];if(s.attrType!=="Cluster")return;const a={ID:r.ID,indices:[],weights:[],transformLink:new Te().fromArray(s.TransformLink.a)};"Indexes"in s&&(a.indices=s.Indexes.a,a.weights=s.Weights.a),n.push(a)}),{rawBones:n,bones:[]}}parseMorphTargets(e,t){const n=[];for(let r=0;r<e.children.length;r++){const s=e.children[r],a=t[s.ID],o={name:a.attrName,initialWeight:a.DeformPercent,id:a.id,fullWeights:a.FullWeights.a};if(a.attrType!=="BlendShapeChannel")return;o.geoID=dt.get(parseInt(s.ID)).children.filter(function(l){return l.relationship===void 0})[0].ID,n.push(o)}return n}parseScene(e,t,n){Nt=new di;const r=this.parseModels(e.skeletons,t,n),s=We.Objects.Model,a=this;r.forEach(function(l){const c=s[l.ID];a.setLookAtProperties(l,c),dt.get(l.ID).parents.forEach(function(u){const d=r.get(u.ID);d!==void 0&&d.add(l)}),l.parent===null&&Nt.add(l)}),this.bindSkeleton(e.skeletons,t,r),this.addGlobalSceneSettings(),Nt.traverse(function(l){if(l.userData.transformData){l.parent&&(l.userData.transformData.parentMatrix=l.parent.matrix,l.userData.transformData.parentMatrixWorld=l.parent.matrixWorld);const c=nu(l.userData.transformData);l.applyMatrix4(c),l.updateWorldMatrix()}});const o=new qv().parse();Nt.children.length===1&&Nt.children[0].isGroup&&(Nt.children[0].animations=o,Nt=Nt.children[0]),Nt.animations=o}parseModels(e,t,n){const r=new Map,s=We.Objects.Model;for(const a in s){const o=parseInt(a),l=s[a],c=dt.get(o);let h=this.buildSkeleton(c,e,o,l.attrName);if(!h){switch(l.attrType){case"Camera":h=this.createCamera(c);break;case"Light":h=this.createLight(c);break;case"Mesh":h=this.createMesh(c,t,n);break;case"NurbsCurve":h=this.createCurve(c,t);break;case"LimbNode":case"Root":h=new so;break;case"Null":default:h=new di;break}h.name=l.attrName?Ke.sanitizeNodeName(l.attrName):"",h.userData.originalName=l.attrName,h.ID=o}this.getTransformData(h,l),r.set(o,h)}return r}buildSkeleton(e,t,n,r){let s=null;return e.parents.forEach(function(a){for(const o in t){const l=t[o];l.rawBones.forEach(function(c,h){if(c.ID===a.ID){const u=s;s=new so,s.matrixWorld.copy(c.transformLink),s.name=r?Ke.sanitizeNodeName(r):"",s.userData.originalName=r,s.ID=n,l.bones[h]=s,u!==null&&s.add(u)}})}}),s}createCamera(e){let t,n;if(e.children.forEach(function(r){const s=We.Objects.NodeAttribute[r.ID];s!==void 0&&(n=s)}),n===void 0)t=new rt;else{let r=0;n.CameraProjectionType!==void 0&&n.CameraProjectionType.value===1&&(r=1);let s=1;n.NearPlane!==void 0&&(s=n.NearPlane.value/1e3);let a=1e3;n.FarPlane!==void 0&&(a=n.FarPlane.value/1e3);let o=window.innerWidth,l=window.innerHeight;n.AspectWidth!==void 0&&n.AspectHeight!==void 0&&(o=n.AspectWidth.value,l=n.AspectHeight.value);const c=o/l;let h=45;n.FieldOfView!==void 0&&(h=n.FieldOfView.value);const u=n.FocalLength?n.FocalLength.value:null;switch(r){case 0:t=new Ot(h,c,s,a),u!==null&&t.setFocalLength(u);break;case 1:t=new Ao(-o/2,o/2,l/2,-l/2,s,a);break;default:console.warn("THREE.FBXLoader: Unknown camera type "+r+"."),t=new rt;break}}return t}createLight(e){let t,n;if(e.children.forEach(function(r){const s=We.Objects.NodeAttribute[r.ID];s!==void 0&&(n=s)}),n===void 0)t=new rt;else{let r;n.LightType===void 0?r=0:r=n.LightType.value;let s=16777215;n.Color!==void 0&&(s=new Ie().fromArray(n.Color.value).convertSRGBToLinear());let a=n.Intensity===void 0?1:n.Intensity.value/100;n.CastLightOnObject!==void 0&&n.CastLightOnObject.value===0&&(a=0);let o=0;n.FarAttenuationEnd!==void 0&&(n.EnableFarAttenuation!==void 0&&n.EnableFarAttenuation.value===0?o=0:o=n.FarAttenuationEnd.value);const l=1;switch(r){case 0:t=new Cc(s,a,o,l);break;case 1:t=new Oh(s,a);break;case 2:let c=Math.PI/3;n.InnerAngle!==void 0&&(c=Ct.degToRad(n.InnerAngle.value));let h=0;n.OuterAngle!==void 0&&(h=Ct.degToRad(n.OuterAngle.value),h=Math.max(h,1)),t=new Bx(s,a,o,c,h,l);break;default:console.warn("THREE.FBXLoader: Unknown light type "+n.LightType.value+", defaulting to a PointLight."),t=new Cc(s,a);break}n.CastShadows!==void 0&&n.CastShadows.value===1&&(t.castShadow=!0)}return t}createMesh(e,t,n){let r,s=null,a=null;const o=[];return e.children.forEach(function(l){t.has(l.ID)&&(s=t.get(l.ID)),n.has(l.ID)&&o.push(n.get(l.ID))}),o.length>1?a=o:o.length>0?a=o[0]:(a=new Ua({name:bi.DEFAULT_MATERIAL_NAME,color:13421772}),o.push(a)),"color"in s.attributes&&o.forEach(function(l){l.vertexColors=!0}),s.FBX_Deformer?(r=new tx(s,a),r.normalizeSkinWeights()):r=new kt(s,a),r}createCurve(e,t){const n=e.children.reduce(function(s,a){return t.has(a.ID)&&(s=t.get(a.ID)),s},null),r=new Or({name:bi.DEFAULT_MATERIAL_NAME,color:3342591,linewidth:1});return new Ro(n,r)}getTransformData(e,t){const n={};"InheritType"in t&&(n.inheritType=parseInt(t.InheritType.value)),"RotationOrder"in t?n.eulerOrder=iu(t.RotationOrder.value):n.eulerOrder="ZYX","Lcl_Translation"in t&&(n.translation=t.Lcl_Translation.value),"PreRotation"in t&&(n.preRotation=t.PreRotation.value),"Lcl_Rotation"in t&&(n.rotation=t.Lcl_Rotation.value),"PostRotation"in t&&(n.postRotation=t.PostRotation.value),"Lcl_Scaling"in t&&(n.scale=t.Lcl_Scaling.value),"ScalingOffset"in t&&(n.scalingOffset=t.ScalingOffset.value),"ScalingPivot"in t&&(n.scalingPivot=t.ScalingPivot.value),"RotationOffset"in t&&(n.rotationOffset=t.RotationOffset.value),"RotationPivot"in t&&(n.rotationPivot=t.RotationPivot.value),e.userData.transformData=n}setLookAtProperties(e,t){"LookAtProperty"in t&&dt.get(e.ID).children.forEach(function(r){if(r.relationship==="LookAtProperty"){const s=We.Objects.Model[r.ID];if("Lcl_Translation"in s){const a=s.Lcl_Translation.value;e.target!==void 0?(e.target.position.fromArray(a),Nt.add(e.target)):e.lookAt(new P().fromArray(a))}}})}bindSkeleton(e,t,n){const r=this.parsePoseNodes();for(const s in e){const a=e[s];dt.get(parseInt(a.ID)).parents.forEach(function(l){if(t.has(l.ID)){const c=l.ID;dt.get(c).parents.forEach(function(u){n.has(u.ID)&&n.get(u.ID).bind(new wo(a.bones),r[u.ID])})}})}}parsePoseNodes(){const e={};if("Pose"in We.Objects){const t=We.Objects.Pose;for(const n in t)if(t[n].attrType==="BindPose"&&t[n].NbPoseNodes>0){const r=t[n].PoseNode;Array.isArray(r)?r.forEach(function(s){e[s.Node]=new Te().fromArray(s.Matrix.a)}):e[r.Node]=new Te().fromArray(r.Matrix.a)}}return e}addGlobalSceneSettings(){if("GlobalSettings"in We){if("AmbientColor"in We.GlobalSettings){const e=We.GlobalSettings.AmbientColor.value,t=e[0],n=e[1],r=e[2];if(t!==0||n!==0||r!==0){const s=new Ie(t,n,r).convertSRGBToLinear();Nt.add(new Gx(s,1))}}"UnitScaleFactor"in We.GlobalSettings&&(Nt.userData.unitScaleFactor=We.GlobalSettings.UnitScaleFactor.value)}}}class $v{constructor(){this.negativeMaterialIndices=!1}parse(e){const t=new Map;if("Geometry"in We.Objects){const n=We.Objects.Geometry;for(const r in n){const s=dt.get(parseInt(r)),a=this.parseGeometry(s,n[r],e);t.set(parseInt(r),a)}}return this.negativeMaterialIndices===!0&&console.warn("THREE.FBXLoader: The FBX file contains invalid (negative) material indices. The asset might not render as expected."),t}parseGeometry(e,t,n){switch(t.attrType){case"Mesh":return this.parseMeshGeometry(e,t,n);case"NurbsCurve":return this.parseNurbsGeometry(t)}}parseMeshGeometry(e,t,n){const r=n.skeletons,s=[],a=e.parents.map(function(u){return We.Objects.Model[u.ID]});if(a.length===0)return;const o=e.children.reduce(function(u,d){return r[d.ID]!==void 0&&(u=r[d.ID]),u},null);e.children.forEach(function(u){n.morphTargets[u.ID]!==void 0&&s.push(n.morphTargets[u.ID])});const l=a[0],c={};"RotationOrder"in l&&(c.eulerOrder=iu(l.RotationOrder.value)),"InheritType"in l&&(c.inheritType=parseInt(l.InheritType.value)),"GeometricTranslation"in l&&(c.translation=l.GeometricTranslation.value),"GeometricRotation"in l&&(c.rotation=l.GeometricRotation.value),"GeometricScaling"in l&&(c.scale=l.GeometricScaling.value);const h=nu(c);return this.genGeometry(t,o,s,h)}genGeometry(e,t,n,r){const s=new It;e.attrName&&(s.name=e.attrName);const a=this.parseGeoNode(e,t),o=this.genBuffers(a),l=new ct(o.vertex,3);if(l.applyMatrix4(r),s.setAttribute("position",l),o.colors.length>0&&s.setAttribute("color",new ct(o.colors,3)),t&&(s.setAttribute("skinIndex",new bo(o.weightsIndices,4)),s.setAttribute("skinWeight",new ct(o.vertexWeights,4)),s.FBX_Deformer=t),o.normal.length>0){const c=new Xe().getNormalMatrix(r),h=new ct(o.normal,3);h.applyNormalMatrix(c),s.setAttribute("normal",h)}if(o.uvs.forEach(function(c,h){const u=h===0?"uv":`uv${h}`;s.setAttribute(u,new ct(o.uvs[h],2))}),a.material&&a.material.mappingType!=="AllSame"){let c=o.materialIndex[0],h=0;if(o.materialIndex.forEach(function(u,d){u!==c&&(s.addGroup(h,d-h,c),c=u,h=d)}),s.groups.length>0){const u=s.groups[s.groups.length-1],d=u.start+u.count;d!==o.materialIndex.length&&s.addGroup(d,o.materialIndex.length-d,c)}s.groups.length===0&&s.addGroup(0,o.materialIndex.length,o.materialIndex[0])}return this.addMorphTargets(s,e,n,r),s}parseGeoNode(e,t){const n={};if(n.vertexPositions=e.Vertices!==void 0?e.Vertices.a:[],n.vertexIndices=e.PolygonVertexIndex!==void 0?e.PolygonVertexIndex.a:[],e.LayerElementColor&&(n.color=this.parseVertexColors(e.LayerElementColor[0])),e.LayerElementMaterial&&(n.material=this.parseMaterialIndices(e.LayerElementMaterial[0])),e.LayerElementNormal&&(n.normal=this.parseNormals(e.LayerElementNormal[0])),e.LayerElementUV){n.uv=[];let r=0;for(;e.LayerElementUV[r];)e.LayerElementUV[r].UV&&n.uv.push(this.parseUVs(e.LayerElementUV[r])),r++}return n.weightTable={},t!==null&&(n.skeleton=t,t.rawBones.forEach(function(r,s){r.indices.forEach(function(a,o){n.weightTable[a]===void 0&&(n.weightTable[a]=[]),n.weightTable[a].push({id:s,weight:r.weights[o]})})})),n}genBuffers(e){const t={vertex:[],normal:[],colors:[],uvs:[],materialIndex:[],vertexWeights:[],weightsIndices:[]};let n=0,r=0,s=!1,a=[],o=[],l=[],c=[],h=[],u=[];const d=this;return e.vertexIndices.forEach(function(f,g){let x,m=!1;f<0&&(f=f^-1,m=!0);let p=[],v=[];if(a.push(f*3,f*3+1,f*3+2),e.color){const _=xs(g,n,f,e.color);l.push(_[0],_[1],_[2])}if(e.skeleton){if(e.weightTable[f]!==void 0&&e.weightTable[f].forEach(function(_){v.push(_.weight),p.push(_.id)}),v.length>4){s||(console.warn("THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex. Deleting additional weights."),s=!0);const _=[0,0,0,0],b=[0,0,0,0];v.forEach(function(C,w){let T=C,D=p[w];b.forEach(function(S,A,N){if(T>S){N[A]=T,T=S;const W=_[A];_[A]=D,D=W}})}),p=_,v=b}for(;v.length<4;)v.push(0),p.push(0);for(let _=0;_<4;++_)h.push(v[_]),u.push(p[_])}if(e.normal){const _=xs(g,n,f,e.normal);o.push(_[0],_[1],_[2])}e.material&&e.material.mappingType!=="AllSame"&&(x=xs(g,n,f,e.material)[0],x<0&&(d.negativeMaterialIndices=!0,x=0)),e.uv&&e.uv.forEach(function(_,b){const C=xs(g,n,f,_);c[b]===void 0&&(c[b]=[]),c[b].push(C[0]),c[b].push(C[1])}),r++,m&&(d.genFace(t,e,a,x,o,l,c,h,u,r),n++,r=0,a=[],o=[],l=[],c=[],h=[],u=[])}),t}getNormalNewell(e){const t=new P(0,0,0);for(let n=0;n<e.length;n++){const r=e[n],s=e[(n+1)%e.length];t.x+=(r.y-s.y)*(r.z+s.z),t.y+=(r.z-s.z)*(r.x+s.x),t.z+=(r.x-s.x)*(r.y+s.y)}return t.normalize(),t}getNormalTangentAndBitangent(e){const t=this.getNormalNewell(e),r=(Math.abs(t.z)>.5?new P(0,1,0):new P(0,0,1)).cross(t).normalize(),s=t.clone().cross(r).normalize();return{normal:t,tangent:r,bitangent:s}}flattenVertex(e,t,n){return new Le(e.dot(t),e.dot(n))}genFace(e,t,n,r,s,a,o,l,c,h){let u;if(h>3){const d=[];for(let m=0;m<n.length;m+=3)d.push(new P(t.vertexPositions[n[m]],t.vertexPositions[n[m+1]],t.vertexPositions[n[m+2]]));const{tangent:f,bitangent:g}=this.getNormalTangentAndBitangent(d),x=[];for(const m of d)x.push(this.flattenVertex(m,f,g));u=Po.triangulateShape(x,[])}else u=[[0,1,2]];for(const[d,f,g]of u)e.vertex.push(t.vertexPositions[n[d*3]]),e.vertex.push(t.vertexPositions[n[d*3+1]]),e.vertex.push(t.vertexPositions[n[d*3+2]]),e.vertex.push(t.vertexPositions[n[f*3]]),e.vertex.push(t.vertexPositions[n[f*3+1]]),e.vertex.push(t.vertexPositions[n[f*3+2]]),e.vertex.push(t.vertexPositions[n[g*3]]),e.vertex.push(t.vertexPositions[n[g*3+1]]),e.vertex.push(t.vertexPositions[n[g*3+2]]),t.skeleton&&(e.vertexWeights.push(l[d*4]),e.vertexWeights.push(l[d*4+1]),e.vertexWeights.push(l[d*4+2]),e.vertexWeights.push(l[d*4+3]),e.vertexWeights.push(l[f*4]),e.vertexWeights.push(l[f*4+1]),e.vertexWeights.push(l[f*4+2]),e.vertexWeights.push(l[f*4+3]),e.vertexWeights.push(l[g*4]),e.vertexWeights.push(l[g*4+1]),e.vertexWeights.push(l[g*4+2]),e.vertexWeights.push(l[g*4+3]),e.weightsIndices.push(c[d*4]),e.weightsIndices.push(c[d*4+1]),e.weightsIndices.push(c[d*4+2]),e.weightsIndices.push(c[d*4+3]),e.weightsIndices.push(c[f*4]),e.weightsIndices.push(c[f*4+1]),e.weightsIndices.push(c[f*4+2]),e.weightsIndices.push(c[f*4+3]),e.weightsIndices.push(c[g*4]),e.weightsIndices.push(c[g*4+1]),e.weightsIndices.push(c[g*4+2]),e.weightsIndices.push(c[g*4+3])),t.color&&(e.colors.push(a[d*3]),e.colors.push(a[d*3+1]),e.colors.push(a[d*3+2]),e.colors.push(a[f*3]),e.colors.push(a[f*3+1]),e.colors.push(a[f*3+2]),e.colors.push(a[g*3]),e.colors.push(a[g*3+1]),e.colors.push(a[g*3+2])),t.material&&t.material.mappingType!=="AllSame"&&(e.materialIndex.push(r),e.materialIndex.push(r),e.materialIndex.push(r)),t.normal&&(e.normal.push(s[d*3]),e.normal.push(s[d*3+1]),e.normal.push(s[d*3+2]),e.normal.push(s[f*3]),e.normal.push(s[f*3+1]),e.normal.push(s[f*3+2]),e.normal.push(s[g*3]),e.normal.push(s[g*3+1]),e.normal.push(s[g*3+2])),t.uv&&t.uv.forEach(function(x,m){e.uvs[m]===void 0&&(e.uvs[m]=[]),e.uvs[m].push(o[m][d*2]),e.uvs[m].push(o[m][d*2+1]),e.uvs[m].push(o[m][f*2]),e.uvs[m].push(o[m][f*2+1]),e.uvs[m].push(o[m][g*2]),e.uvs[m].push(o[m][g*2+1])})}addMorphTargets(e,t,n,r){if(n.length===0)return;e.morphTargetsRelative=!0,e.morphAttributes.position=[];const s=this;n.forEach(function(a){a.rawTargets.forEach(function(o){const l=We.Objects.Geometry[o.geoID];l!==void 0&&s.genMorphGeometry(e,t,l,r,o.name)})})}genMorphGeometry(e,t,n,r,s){const a=t.PolygonVertexIndex!==void 0?t.PolygonVertexIndex.a:[],o=n.Vertices!==void 0?n.Vertices.a:[],l=n.Indexes!==void 0?n.Indexes.a:[],c=e.attributes.position.count*3,h=new Float32Array(c);for(let g=0;g<l.length;g++){const x=l[g]*3;h[x]=o[g*3],h[x+1]=o[g*3+1],h[x+2]=o[g*3+2]}const u={vertexIndices:a,vertexPositions:h},d=this.genBuffers(u),f=new ct(d.vertex,3);f.name=s||n.attrName,f.applyMatrix4(r),e.morphAttributes.position.push(f)}parseNormals(e){const t=e.MappingInformationType,n=e.ReferenceInformationType,r=e.Normals.a;let s=[];return n==="IndexToDirect"&&("NormalIndex"in e?s=e.NormalIndex.a:"NormalsIndex"in e&&(s=e.NormalsIndex.a)),{dataSize:3,buffer:r,indices:s,mappingType:t,referenceType:n}}parseUVs(e){const t=e.MappingInformationType,n=e.ReferenceInformationType,r=e.UV.a;let s=[];return n==="IndexToDirect"&&(s=e.UVIndex.a),{dataSize:2,buffer:r,indices:s,mappingType:t,referenceType:n}}parseVertexColors(e){const t=e.MappingInformationType,n=e.ReferenceInformationType,r=e.Colors.a;let s=[];n==="IndexToDirect"&&(s=e.ColorIndex.a);for(let a=0,o=new Ie;a<r.length;a+=4)o.fromArray(r,a).convertSRGBToLinear().toArray(r,a);return{dataSize:4,buffer:r,indices:s,mappingType:t,referenceType:n}}parseMaterialIndices(e){const t=e.MappingInformationType,n=e.ReferenceInformationType;if(t==="NoMappingInformation")return{dataSize:1,buffer:[0],indices:[0],mappingType:"AllSame",referenceType:n};const r=e.Materials.a,s=[];for(let a=0;a<r.length;++a)s.push(a);return{dataSize:1,buffer:r,indices:s,mappingType:t,referenceType:n}}parseNurbsGeometry(e){const t=parseInt(e.Order);if(isNaN(t))return console.error("THREE.FBXLoader: Invalid Order %s given for geometry ID: %s",e.Order,e.id),new It;const n=t-1,r=e.KnotVector.a,s=[],a=e.Points.a;for(let u=0,d=a.length;u<d;u+=4)s.push(new Qe().fromArray(a,u));let o,l;if(e.Form==="Closed")s.push(s[0]);else if(e.Form==="Periodic"){o=n,l=r.length-1-o;for(let u=0;u<n;++u)s.push(s[u])}const h=new Xv(n,r,s,o,l).getPoints(s.length*12);return new It().setFromPoints(h)}}class qv{parse(){const e=[],t=this.parseClips();if(t!==void 0)for(const n in t){const r=t[n],s=this.addClip(r);e.push(s)}return e}parseClips(){if(We.Objects.AnimationCurve===void 0)return;const e=this.parseAnimationCurveNodes();this.parseAnimationCurves(e);const t=this.parseAnimationLayers(e);return this.parseAnimStacks(t)}parseAnimationCurveNodes(){const e=We.Objects.AnimationCurveNode,t=new Map;for(const n in e){const r=e[n];if(r.attrName.match(/S|R|T|DeformPercent/)!==null){const s={id:r.id,attr:r.attrName,curves:{}};t.set(s.id,s)}}return t}parseAnimationCurves(e){const t=We.Objects.AnimationCurve;for(const n in t){const r={id:t[n].id,times:t[n].KeyTime.a.map(ey),values:t[n].KeyValueFloat.a},s=dt.get(r.id);if(s!==void 0){const a=s.parents[0].ID,o=s.parents[0].relationship;o.match(/X/)?e.get(a).curves.x=r:o.match(/Y/)?e.get(a).curves.y=r:o.match(/Z/)?e.get(a).curves.z=r:o.match(/DeformPercent/)&&e.has(a)&&(e.get(a).curves.morph=r)}}}parseAnimationLayers(e){const t=We.Objects.AnimationLayer,n=new Map;for(const r in t){const s=[],a=dt.get(parseInt(r));a!==void 0&&(a.children.forEach(function(l,c){if(e.has(l.ID)){const h=e.get(l.ID);if(h.curves.x!==void 0||h.curves.y!==void 0||h.curves.z!==void 0){if(s[c]===void 0){const u=dt.get(l.ID).parents.filter(function(d){return d.relationship!==void 0})[0].ID;if(u!==void 0){const d=We.Objects.Model[u.toString()];if(d===void 0){console.warn("THREE.FBXLoader: Encountered a unused curve.",l);return}const f={modelName:d.attrName?Ke.sanitizeNodeName(d.attrName):"",ID:d.id,initialPosition:[0,0,0],initialRotation:[0,0,0],initialScale:[1,1,1]};Nt.traverse(function(g){g.ID===d.id&&(f.transform=g.matrix,g.userData.transformData&&(f.eulerOrder=g.userData.transformData.eulerOrder))}),f.transform||(f.transform=new Te),"PreRotation"in d&&(f.preRotation=d.PreRotation.value),"PostRotation"in d&&(f.postRotation=d.PostRotation.value),s[c]=f}}s[c]&&(s[c][h.attr]=h)}else if(h.curves.morph!==void 0){if(s[c]===void 0){const u=dt.get(l.ID).parents.filter(function(p){return p.relationship!==void 0})[0].ID,d=dt.get(u).parents[0].ID,f=dt.get(d).parents[0].ID,g=dt.get(f).parents[0].ID,x=We.Objects.Model[g],m={modelName:x.attrName?Ke.sanitizeNodeName(x.attrName):"",morphName:We.Objects.Deformer[u].attrName};s[c]=m}s[c][h.attr]=h}}}),n.set(parseInt(r),s))}return n}parseAnimStacks(e){const t=We.Objects.AnimationStack,n={};for(const r in t){const s=dt.get(parseInt(r)).children;s.length>1&&console.warn("THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported. Ignoring subsequent layers.");const a=e.get(s[0].ID);n[r]={name:t[r].attrName,layer:a}}return n}addClip(e){let t=[];const n=this;return e.layer.forEach(function(r){t=t.concat(n.generateTracks(r))}),new lo(e.name,-1,t)}generateTracks(e){const t=[];let n=new P,r=new P;if(e.transform&&e.transform.decompose(n,new gt,r),n=n.toArray(),r=r.toArray(),e.T!==void 0&&Object.keys(e.T.curves).length>0){const s=this.generateVectorTrack(e.modelName,e.T.curves,n,"position");s!==void 0&&t.push(s)}if(e.R!==void 0&&Object.keys(e.R.curves).length>0){const s=this.generateRotationTrack(e.modelName,e.R.curves,e.preRotation,e.postRotation,e.eulerOrder);s!==void 0&&t.push(s)}if(e.S!==void 0&&Object.keys(e.S.curves).length>0){const s=this.generateVectorTrack(e.modelName,e.S.curves,r,"scale");s!==void 0&&t.push(s)}if(e.DeformPercent!==void 0){const s=this.generateMorphTrack(e);s!==void 0&&t.push(s)}return t}generateVectorTrack(e,t,n,r){const s=this.getTimesForAllAxes(t),a=this.getKeyframeTrackValues(s,t,n);return new Ur(e+"."+r,s,a)}generateRotationTrack(e,t,n,r,s){let a,o;if(t.x!==void 0&&t.y!==void 0&&t.z!==void 0){const u=this.interpolateRotations(t.x,t.y,t.z,s);a=u[0],o=u[1]}n!==void 0&&(n=n.map(Ct.degToRad),n.push(s),n=new Gt().fromArray(n),n=new gt().setFromEuler(n)),r!==void 0&&(r=r.map(Ct.degToRad),r.push(s),r=new Gt().fromArray(r),r=new gt().setFromEuler(r).invert());const l=new gt,c=new Gt,h=[];if(!o||!a)return new Si(e+".quaternion",[],[]);for(let u=0;u<o.length;u+=3)c.set(o[u],o[u+1],o[u+2],s),l.setFromEuler(c),n!==void 0&&l.premultiply(n),r!==void 0&&l.multiply(r),u>2&&new gt().fromArray(h,(u-3)/3*4).dot(l)<0&&l.set(-l.x,-l.y,-l.z,-l.w),l.toArray(h,u/3*4);return new Si(e+".quaternion",a,h)}generateMorphTrack(e){const t=e.DeformPercent.curves.morph,n=t.values.map(function(s){return s/100}),r=Nt.getObjectByName(e.modelName).morphTargetDictionary[e.morphName];return new Dr(e.modelName+".morphTargetInfluences["+r+"]",t.times,n)}getTimesForAllAxes(e){let t=[];if(e.x!==void 0&&(t=t.concat(e.x.times)),e.y!==void 0&&(t=t.concat(e.y.times)),e.z!==void 0&&(t=t.concat(e.z.times)),t=t.sort(function(n,r){return n-r}),t.length>1){let n=1,r=t[0];for(let s=1;s<t.length;s++){const a=t[s];a!==r&&(t[n]=a,r=a,n++)}t=t.slice(0,n)}return t}getKeyframeTrackValues(e,t,n){const r=n,s=[];let a=-1,o=-1,l=-1;return e.forEach(function(c){if(t.x&&(a=t.x.times.indexOf(c)),t.y&&(o=t.y.times.indexOf(c)),t.z&&(l=t.z.times.indexOf(c)),a!==-1){const h=t.x.values[a];s.push(h),r[0]=h}else s.push(r[0]);if(o!==-1){const h=t.y.values[o];s.push(h),r[1]=h}else s.push(r[1]);if(l!==-1){const h=t.z.values[l];s.push(h),r[2]=h}else s.push(r[2])}),s}interpolateRotations(e,t,n,r){const s=[],a=[];s.push(e.times[0]),a.push(Ct.degToRad(e.values[0])),a.push(Ct.degToRad(t.values[0])),a.push(Ct.degToRad(n.values[0]));for(let o=1;o<e.values.length;o++){const l=[e.values[o-1],t.values[o-1],n.values[o-1]];if(isNaN(l[0])||isNaN(l[1])||isNaN(l[2]))continue;const c=l.map(Ct.degToRad),h=[e.values[o],t.values[o],n.values[o]];if(isNaN(h[0])||isNaN(h[1])||isNaN(h[2]))continue;const u=h.map(Ct.degToRad),d=[h[0]-l[0],h[1]-l[1],h[2]-l[2]],f=[Math.abs(d[0]),Math.abs(d[1]),Math.abs(d[2])];if(f[0]>=180||f[1]>=180||f[2]>=180){const x=Math.max(...f)/180,m=new Gt(...c,r),p=new Gt(...u,r),v=new gt().setFromEuler(m),_=new gt().setFromEuler(p);v.dot(_)&&_.set(-_.x,-_.y,-_.z,-_.w);const b=e.times[o-1],C=e.times[o]-b,w=new gt,T=new Gt;for(let D=0;D<1;D+=1/x)w.copy(v.clone().slerp(_.clone(),D)),s.push(b+D*C),T.setFromQuaternion(w,r),a.push(T.x),a.push(T.y),a.push(T.z)}else s.push(e.times[o]),a.push(Ct.degToRad(e.values[o])),a.push(Ct.degToRad(t.values[o])),a.push(Ct.degToRad(n.values[o]))}return[s,a]}}class Kv{getPrevNode(){return this.nodeStack[this.currentIndent-2]}getCurrentNode(){return this.nodeStack[this.currentIndent-1]}getCurrentProp(){return this.currentProp}pushStack(e){this.nodeStack.push(e),this.currentIndent+=1}popStack(){this.nodeStack.pop(),this.currentIndent-=1}setCurrentProp(e,t){this.currentProp=e,this.currentPropName=t}parse(e){this.currentIndent=0,this.allNodes=new tu,this.nodeStack=[],this.currentProp=[],this.currentPropName="";const t=this,n=e.split(/[\r\n]+/);return n.forEach(function(r,s){const a=r.match(/^[\s\t]*;/),o=r.match(/^[\s\t]*$/);if(a||o)return;const l=r.match("^\\t{"+t.currentIndent+"}(\\w+):(.*){",""),c=r.match("^\\t{"+t.currentIndent+"}(\\w+):[\\s\\t\\r\\n](.*)"),h=r.match("^\\t{"+(t.currentIndent-1)+"}}");l?t.parseNodeBegin(r,l):c?t.parseNodeProperty(r,c,n[++s]):h?t.popStack():r.match(/^[^\s\t}]/)&&t.parseNodePropertyContinued(r)}),this.allNodes}parseNodeBegin(e,t){const n=t[1].trim().replace(/^"/,"").replace(/"$/,""),r=t[2].split(",").map(function(l){return l.trim().replace(/^"/,"").replace(/"$/,"")}),s={name:n},a=this.parseNodeAttr(r),o=this.getCurrentNode();this.currentIndent===0?this.allNodes.add(n,s):n in o?(n==="PoseNode"?o.PoseNode.push(s):o[n].id!==void 0&&(o[n]={},o[n][o[n].id]=o[n]),a.id!==""&&(o[n][a.id]=s)):typeof a.id=="number"?(o[n]={},o[n][a.id]=s):n!=="Properties70"&&(n==="PoseNode"?o[n]=[s]:o[n]=s),typeof a.id=="number"&&(s.id=a.id),a.name!==""&&(s.attrName=a.name),a.type!==""&&(s.attrType=a.type),this.pushStack(s)}parseNodeAttr(e){let t=e[0];e[0]!==""&&(t=parseInt(e[0]),isNaN(t)&&(t=e[0]));let n="",r="";return e.length>1&&(n=e[1].replace(/^(\w+)::/,""),r=e[2]),{id:t,name:n,type:r}}parseNodeProperty(e,t,n){let r=t[1].replace(/^"/,"").replace(/"$/,"").trim(),s=t[2].replace(/^"/,"").replace(/"$/,"").trim();r==="Content"&&s===","&&(s=n.replace(/"/g,"").replace(/,$/,"").trim());const a=this.getCurrentNode();if(a.name==="Properties70"){this.parseNodeSpecialProperty(e,r,s);return}if(r==="C"){const l=s.split(",").slice(1),c=parseInt(l[0]),h=parseInt(l[1]);let u=s.split(",").slice(3);u=u.map(function(d){return d.trim().replace(/^"/,"")}),r="connections",s=[c,h],ny(s,u),a[r]===void 0&&(a[r]=[])}r==="Node"&&(a.id=s),r in a&&Array.isArray(a[r])?a[r].push(s):r!=="a"?a[r]=s:a.a=s,this.setCurrentProp(a,r),r==="a"&&s.slice(-1)!==","&&(a.a=Xa(s))}parseNodePropertyContinued(e){const t=this.getCurrentNode();t.a+=e,e.slice(-1)!==","&&(t.a=Xa(t.a))}parseNodeSpecialProperty(e,t,n){const r=n.split('",').map(function(h){return h.trim().replace(/^\"/,"").replace(/\s/,"_")}),s=r[0],a=r[1],o=r[2],l=r[3];let c=r[4];switch(a){case"int":case"enum":case"bool":case"ULongLong":case"double":case"Number":case"FieldOfView":c=parseFloat(c);break;case"Color":case"ColorRGB":case"Vector3D":case"Lcl_Translation":case"Lcl_Rotation":case"Lcl_Scaling":c=Xa(c);break}this.getPrevNode()[s]={type:a,type2:o,flag:l,value:c},this.setCurrentProp(this.getPrevNode(),s)}}class Zv{parse(e){const t=new qc(e);t.skip(23);const n=t.getUint32();if(n<6400)throw new Error("THREE.FBXLoader: FBX version not supported, FileVersion: "+n);const r=new tu;for(;!this.endOfContent(t);){const s=this.parseNode(t,n);s!==null&&r.add(s.name,s)}return r}endOfContent(e){return e.size()%16===0?(e.getOffset()+160+16&-16)>=e.size():e.getOffset()+160+16>=e.size()}parseNode(e,t){const n={},r=t>=7500?e.getUint64():e.getUint32(),s=t>=7500?e.getUint64():e.getUint32();t>=7500?e.getUint64():e.getUint32();const a=e.getUint8(),o=e.getString(a);if(r===0)return null;const l=[];for(let d=0;d<s;d++)l.push(this.parseProperty(e));const c=l.length>0?l[0]:"",h=l.length>1?l[1]:"",u=l.length>2?l[2]:"";for(n.singleProperty=s===1&&e.getOffset()===r;r>e.getOffset();){const d=this.parseNode(e,t);d!==null&&this.parseSubNode(o,n,d)}return n.propertyList=l,typeof c=="number"&&(n.id=c),h!==""&&(n.attrName=h),u!==""&&(n.attrType=u),o!==""&&(n.name=o),n}parseSubNode(e,t,n){if(n.singleProperty===!0){const r=n.propertyList[0];Array.isArray(r)?(t[n.name]=n,n.a=r):t[n.name]=r}else if(e==="Connections"&&n.name==="C"){const r=[];n.propertyList.forEach(function(s,a){a!==0&&r.push(s)}),t.connections===void 0&&(t.connections=[]),t.connections.push(r)}else if(n.name==="Properties70")Object.keys(n).forEach(function(s){t[s]=n[s]});else if(e==="Properties70"&&n.name==="P"){let r=n.propertyList[0],s=n.propertyList[1];const a=n.propertyList[2],o=n.propertyList[3];let l;r.indexOf("Lcl ")===0&&(r=r.replace("Lcl ","Lcl_")),s.indexOf("Lcl ")===0&&(s=s.replace("Lcl ","Lcl_")),s==="Color"||s==="ColorRGB"||s==="Vector"||s==="Vector3D"||s.indexOf("Lcl_")===0?l=[n.propertyList[4],n.propertyList[5],n.propertyList[6]]:l=n.propertyList[4],t[r]={type:s,type2:a,flag:o,value:l}}else t[n.name]===void 0?typeof n.id=="number"?(t[n.name]={},t[n.name][n.id]=n):t[n.name]=n:n.name==="PoseNode"?(Array.isArray(t[n.name])||(t[n.name]=[t[n.name]]),t[n.name].push(n)):t[n.name][n.id]===void 0&&(t[n.name][n.id]=n)}parseProperty(e){const t=e.getString(1);let n;switch(t){case"C":return e.getBoolean();case"D":return e.getFloat64();case"F":return e.getFloat32();case"I":return e.getInt32();case"L":return e.getInt64();case"R":return n=e.getUint32(),e.getArrayBuffer(n);case"S":return n=e.getUint32(),e.getString(n);case"Y":return e.getInt16();case"b":case"c":case"d":case"f":case"i":case"l":const r=e.getUint32(),s=e.getUint32(),a=e.getUint32();if(s===0)switch(t){case"b":case"c":return e.getBooleanArray(r);case"d":return e.getFloat64Array(r);case"f":return e.getFloat32Array(r);case"i":return e.getInt32Array(r);case"l":return e.getInt64Array(r)}const o=Fv(new Uint8Array(e.getArrayBuffer(a))),l=new qc(o.buffer);switch(t){case"b":case"c":return l.getBooleanArray(r);case"d":return l.getFloat64Array(r);case"f":return l.getFloat32Array(r);case"i":return l.getInt32Array(r);case"l":return l.getInt64Array(r)}break;default:throw new Error("THREE.FBXLoader: Unknown property type "+t)}}}class qc{constructor(e,t){this.dv=new DataView(e),this.offset=0,this.littleEndian=t!==void 0?t:!0,this._textDecoder=new TextDecoder}getOffset(){return this.offset}size(){return this.dv.buffer.byteLength}skip(e){this.offset+=e}getBoolean(){return(this.getUint8()&1)===1}getBooleanArray(e){const t=[];for(let n=0;n<e;n++)t.push(this.getBoolean());return t}getUint8(){const e=this.dv.getUint8(this.offset);return this.offset+=1,e}getInt16(){const e=this.dv.getInt16(this.offset,this.littleEndian);return this.offset+=2,e}getInt32(){const e=this.dv.getInt32(this.offset,this.littleEndian);return this.offset+=4,e}getInt32Array(e){const t=[];for(let n=0;n<e;n++)t.push(this.getInt32());return t}getUint32(){const e=this.dv.getUint32(this.offset,this.littleEndian);return this.offset+=4,e}getInt64(){let e,t;return this.littleEndian?(e=this.getUint32(),t=this.getUint32()):(t=this.getUint32(),e=this.getUint32()),t&2147483648?(t=~t&4294967295,e=~e&4294967295,e===4294967295&&(t=t+1&4294967295),e=e+1&4294967295,-(t*4294967296+e)):t*4294967296+e}getInt64Array(e){const t=[];for(let n=0;n<e;n++)t.push(this.getInt64());return t}getUint64(){let e,t;return this.littleEndian?(e=this.getUint32(),t=this.getUint32()):(t=this.getUint32(),e=this.getUint32()),t*4294967296+e}getFloat32(){const e=this.dv.getFloat32(this.offset,this.littleEndian);return this.offset+=4,e}getFloat32Array(e){const t=[];for(let n=0;n<e;n++)t.push(this.getFloat32());return t}getFloat64(){const e=this.dv.getFloat64(this.offset,this.littleEndian);return this.offset+=8,e}getFloat64Array(e){const t=[];for(let n=0;n<e;n++)t.push(this.getFloat64());return t}getArrayBuffer(e){const t=this.dv.buffer.slice(this.offset,this.offset+e);return this.offset+=e,t}getString(e){const t=this.offset;let n=new Uint8Array(this.dv.buffer,t,e);this.skip(e);const r=n.indexOf(0);return r>=0&&(n=new Uint8Array(this.dv.buffer,t,r)),this._textDecoder.decode(n)}}class tu{add(e,t){this[e]=t}}function Jv(i){const e="Kaydara FBX Binary  \0";return i.byteLength>=e.length&&e===ru(i,0,e.length)}function Qv(i){const e=["K","a","y","d","a","r","a","\\","F","B","X","\\","B","i","n","a","r","y","\\","\\"];let t=0;function n(r){const s=i[r-1];return i=i.slice(t+r),t++,s}for(let r=0;r<e.length;++r)if(n(1)===e[r])return!1;return!0}function Kc(i){const e=/FBXVersion: (\d+)/,t=i.match(e);if(t)return parseInt(t[1]);throw new Error("THREE.FBXLoader: Cannot find the version number for the file given.")}function ey(i){return i/46186158e3}const ty=[];function xs(i,e,t,n){let r;switch(n.mappingType){case"ByPolygonVertex":r=i;break;case"ByPolygon":r=e;break;case"ByVertice":r=t;break;case"AllSame":r=n.indices[0];break;default:console.warn("THREE.FBXLoader: unknown attribute mapping type "+n.mappingType)}n.referenceType==="IndexToDirect"&&(r=n.indices[r]);const s=r*n.dataSize,a=s+n.dataSize;return iy(ty,n.buffer,s,a)}const Wa=new Gt,Wi=new P;function nu(i){const e=new Te,t=new Te,n=new Te,r=new Te,s=new Te,a=new Te,o=new Te,l=new Te,c=new Te,h=new Te,u=new Te,d=new Te,f=i.inheritType?i.inheritType:0;if(i.translation&&e.setPosition(Wi.fromArray(i.translation)),i.preRotation){const A=i.preRotation.map(Ct.degToRad);A.push(i.eulerOrder||Gt.DEFAULT_ORDER),t.makeRotationFromEuler(Wa.fromArray(A))}if(i.rotation){const A=i.rotation.map(Ct.degToRad);A.push(i.eulerOrder||Gt.DEFAULT_ORDER),n.makeRotationFromEuler(Wa.fromArray(A))}if(i.postRotation){const A=i.postRotation.map(Ct.degToRad);A.push(i.eulerOrder||Gt.DEFAULT_ORDER),r.makeRotationFromEuler(Wa.fromArray(A)),r.invert()}i.scale&&s.scale(Wi.fromArray(i.scale)),i.scalingOffset&&o.setPosition(Wi.fromArray(i.scalingOffset)),i.scalingPivot&&a.setPosition(Wi.fromArray(i.scalingPivot)),i.rotationOffset&&l.setPosition(Wi.fromArray(i.rotationOffset)),i.rotationPivot&&c.setPosition(Wi.fromArray(i.rotationPivot)),i.parentMatrixWorld&&(u.copy(i.parentMatrix),h.copy(i.parentMatrixWorld));const g=t.clone().multiply(n).multiply(r),x=new Te;x.extractRotation(h);const m=new Te;m.copyPosition(h);const p=m.clone().invert().multiply(h),v=x.clone().invert().multiply(p),_=s,b=new Te;if(f===0)b.copy(x).multiply(g).multiply(v).multiply(_);else if(f===1)b.copy(x).multiply(v).multiply(g).multiply(_);else{const N=new Te().scale(new P().setFromMatrixScale(u)).clone().invert(),W=v.clone().multiply(N);b.copy(x).multiply(g).multiply(W).multiply(_)}const C=c.clone().invert(),w=a.clone().invert();let T=e.clone().multiply(l).multiply(c).multiply(t).multiply(n).multiply(r).multiply(C).multiply(o).multiply(a).multiply(s).multiply(w);const D=new Te().copyPosition(T),S=h.clone().multiply(D);return d.copyPosition(S),T=d.clone().multiply(b),T.premultiply(h.invert()),T}function iu(i){i=i||0;const e=["ZYX","YZX","XZY","ZXY","YXZ","XYZ"];return i===6?(console.warn("THREE.FBXLoader: unsupported Euler Order: Spherical XYZ. Animations and rotations may be incorrect."),e[0]):e[i]}function Xa(i){return i.split(",").map(function(t){return parseFloat(t)})}function ru(i,e,t){return e===void 0&&(e=0),t===void 0&&(t=i.byteLength),new TextDecoder().decode(new Uint8Array(i,e,t))}function ny(i,e){for(let t=0,n=i.length,r=e.length;t<r;t++,n++)i[n]=e[t]}function iy(i,e,t,n){for(let r=t,s=0;r<n;r++,s++)i[s]=e[r];return i}const vr=new Mi,Zc=new P,ja=new P,Xi=new P;function ry(i){return i.animations.find(e=>e.duration>0&&e.tracks.length>0)??null}async function sy(i){const e=await fetch(i,{method:"HEAD"}),t=e.headers.get("content-type")??"";if(!e.ok||t.includes("text/html"))throw new Error(`FBX asset unavailable (${e.status||"unknown status"}, ${t||"unknown content-type"})`);return new Promise((n,r)=>{new jv().load(i,n,void 0,r)})}function su(i){return i.isSkinnedMesh===!0}function ay(i){i.traverse(e=>{const t=e;su(t)&&t.skeleton.pose()}),i.updateMatrixWorld(!0)}function oy(i,e){i.updateMatrixWorld(!0),vr.setFromObject(i),vr.getSize(Zc);const t=Math.max(Zc.y,.001);i.scale.multiplyScalar(e.targetHeight/t),i.rotation.y+=e.yawRadians??0,i.updateMatrixWorld(!0),vr.setFromObject(i),vr.getCenter(ja),i.position.x+=e.centerX-ja.x,i.position.y+=e.floorY-vr.min.y,i.position.z+=e.centerZ-ja.z,i.updateMatrixWorld(!0)}function ly(i,e,t=1/0){const n=[],r=[],s=[],a=new Map;i.traverse(h=>{const u=h;if(!u.isMesh)return;const d=u.geometry.getAttribute("position");if(!d)return;u.frustumCulled=!1;const f=Array.isArray(u.material)?u.material:[u.material];for(const x of f)x&&(x.side=pn);const g=u.geometry.getIndex();n.push({mesh:u,position:d,index:g,meshId:n.length,triangleCount:Math.floor(g?g.count/3:d.count/3)})});const o=n.reduce((h,u)=>h+u.triangleCount,0),l=Number.isFinite(t)?Math.max(1,Math.ceil(o/Math.max(1,t))):1;let c=0;for(const h of n){const{mesh:u,position:d,index:f,meshId:g}=h,x=su(u)?u:null,m=v=>{const _=`${g}:${v}`,b=a.get(_);if(b!==void 0)return b;const C=r.length;return a.set(_,C),r.push({mesh:u,skinnedMesh:x,position:d,index:v}),C},p=(v,_,b)=>{if(s.length>=t||c%l!==0){c++;return}s.push({a:m(v),b:m(_),c:m(b),materialIndex:e}),c++};if(f)for(let v=0;v+2<f.count;v+=3)p(f.getX(v),f.getX(v+1),f.getX(v+2));else for(let v=0;v+2<d.count;v+=3)p(v,v+1,v+2)}return{refs:r,vertices:new Float32Array(r.length*3),triangles:s}}function Ya(i,e){let t=0;for(const n of i){const{mesh:r,skinnedMesh:s,position:a,index:o}=n;Xi.fromBufferAttribute(a,o),s&&s.applyBoneTransform(o,Xi),Xi.applyMatrix4(r.matrixWorld),e[t++]=Xi.x,e[t++]=Xi.y,e[t++]=Xi.z}}async function cy(i){let e=null;for(const t of i.sources)try{const n=await sy(t.url);n.name=t.label,oy(n,i);const r=ry(n),s=r?new n0(n):null,a=r&&s?s.clipAction(r):null;let o=!1;a&&(a.setLoop(ch,1/0),a.clampWhenFinished=!1,a.enabled=!0,a.paused=!0),n.updateMatrixWorld(!0);const{refs:l,vertices:c,triangles:h}=ly(n,i.materialIndex,i.maxColliderTriangles);if(l.length===0||h.length===0)throw new Error(`${t.label} has no mesh geometry`);if(!r&&i.sources.indexOf(t)<i.sources.length-1)throw new Error(`${t.label} has no playable animation`);return Ya(l,c),i.parent.add(n),{root:n,mixer:s,vertices:c,triangles:h,label:t.label,animationName:(r==null?void 0:r.name)??null,play(u=!1){!a||!s||(u&&a.reset(),a.enabled=!0,a.paused=!1,a.timeScale=i.animationTimeScale??1,a.setEffectiveWeight(1),a.play(),o=!0,n.updateMatrixWorld(!0),s.update(0))},pause(){a&&(a.paused=!0),o=!1},setBindPose(){return s==null||s.stopAllAction(),o=!1,ay(n),Ya(l,c),c},setMaterialIndex(u){for(const d of h)d.materialIndex=u},advance(u){o&&(o&&(s==null||s.update(u)),n.updateMatrixWorld(!0))},sampleVertices(){return n.updateMatrixWorld(!0),Ya(l,c),c}}}catch(n){e=n,console.warn(`[example] failed to load animated collider ${t.label} (${t.url})`,n)}throw e instanceof Error?e:new Error("Failed to load animated collider")}function hy(i,e){const t={rayWidth:32,rayHeight:32,rayDepth:7,showPathGizmo:!1,showFPS:!0};e.listener.setRayCount(t.rayWidth,t.rayHeight),e.listener.setRayDepth(t.rayDepth),e.pathGizmo.setEnabled(t.showPathGizmo),e.statsHUD.setEnabled(t.showFPS);const n=i.addFolder("Listener");n.add(t,"rayWidth",1,32,1).name("Ray Width").onFinishChange(()=>{e.listener.setRayCount(t.rayWidth,t.rayHeight)}),n.add(t,"rayHeight",1,32,1).name("Ray Height").onFinishChange(()=>{e.listener.setRayCount(t.rayWidth,t.rayHeight)}),n.add(t,"rayDepth",1,16,1).name("Ray Depth").onFinishChange(()=>{e.listener.setRayDepth(t.rayDepth)});const r=n.addFolder("Debug overlays");return r.add(t,"showPathGizmo").name("Show Valid Paths").onChange(s=>{e.pathGizmo.setEnabled(s)}),r.add(t,"showFPS").name("Show FPS").onChange(s=>{e.statsHUD.setEnabled(s)}),{folder:n,state:t}}function uy(i,e){const t=i.addFolder("Render Params");return t.add(e.state,"maxDelayRate",.01,.5,.01).name("Max Delay Rate").onChange(n=>e.onMaxDelayRate(n)),t.add(e.state,"pathFadeTime",.005,.2,.005).name("Path Fade Time").onChange(n=>e.onPathFadeTime(n)),t.add(e.state,"maxPathDelay",.1,3,.1).name("Max Path Delay").onChange(n=>e.onMaxPathDelay(n)),{folder:t,state:e.state}}const $n={HKDtree:0,LBVH:1},po={bvhType:$n.LBVH,bvhMaxDepth:10,primPerLeaf:32};function dy(i,e){const t={...po,showBVH:!1},n=()=>e.targets.filter(c=>{var h;return((h=c.isActive)==null?void 0:h.call(c))??!0}).map(c=>c.mesh),r=()=>{if(!t.showBVH){e.bvhGizmo.clear();return}const c=n();c.length>0?e.bvhGizmo.updateMany(c):e.bvhGizmo.clear()};e.bvhGizmo.setEnabled(t.showBVH),r();const s=i.addFolder("Colliders · BVH / refit"),a=()=>{var c;for(const h of e.targets){const{vertices:u,triangles:d}=h.geometryProvider(t);h.mesh.setData(u,d,{bvhType:Number(t.bvhType),bvhMaxDepth:Math.round(t.bvhMaxDepth),primPerLeaf:Math.round(t.primPerLeaf)}),h.object.setUpdateType(Nr.Rebuild)}(c=e.onRebuild)==null||c.call(e),r()};let o=null;const l=()=>{o===null&&(o=requestAnimationFrame(()=>{o=null;try{a()}catch(c){console.error("[example] collider BVH rebuild failed:",c)}}))};return s.add(t,"bvhType",{HKDtree:$n.HKDtree,LBVH:$n.LBVH}).name("Type").onChange(l),s.add(t,"bvhMaxDepth",1,32,1).name("Max Depth").onFinishChange(l),s.add(t,"primPerLeaf",1,32,1).name("Prims / Leaf").onFinishChange(l),s.add(t,"showBVH").name("Show BVH Boxes").onChange(c=>{e.bvhGizmo.setEnabled(c),r()}),{folder:s,state:t}}function $a(i,e,t,n,r,s){const a=n/2,o=r/2,l=s/2;return new Float32Array([i-a,e-o,t-l,i+a,e-o,t-l,i+a,e-o,t+l,i-a,e-o,t+l,i-a,e+o,t-l,i+a,e+o,t-l,i+a,e+o,t+l,i-a,e+o,t+l])}const au=[[0,3,1],[3,2,1],[4,5,7],[5,6,7],[0,4,7],[0,7,3],[1,2,6],[1,6,5],[0,1,5],[0,5,4],[3,7,6],[3,6,2]],Jc=au.map(([i,e,t])=>[i,t,e]);function qa(i,e){return i.map(([t,n,r])=>({a:t,b:n,c:r,materialIndex:e}))}const ou=9.8,No=4.2,lu=6.8,fy=4,Ka={x:2.6,y:-No/2+.04,z:0},py=Math.PI/2,my=.5,gy="./assets/Flair.fbx",_y="./assets/anna_markettravel.mp3",xy=.7,ln=.7,vy=.85,yy=.75,_i={x:-3,y:-.5,z:1.1},Dt={x:0,y:0,z:0},Rn={x:Dt.x-1.35,y:-.35,z:.55},Cn={x:.22,y:2.2,z:2};function cu(){return{width:Math.max(1,Math.round(window.innerWidth*vy)),height:Math.max(1,Math.round(window.innerHeight*yy))}}const Fs=cu(),$t=new Q_;$t.background=new Ie(1118481);const lr=new Ot(60,Fs.width/Fs.height,.1,100);lr.position.set(8,6,11);lr.lookAt(0,0,0);const ti=new Ch({antialias:!0});ti.setPixelRatio(xy);ti.setSize(Fs.width,Fs.height);ti.domElement.style.display="block";ti.domElement.style.margin="0 auto";document.body.appendChild(ti.domElement);$t.add(new Nx(16777215,3158080,1.8));const hu=new Oh(16777215,1.6);hu.position.set(4,8,6);$t.add(hu);const Sy=new kt(new Ti(ou,No,lu),new Ai({color:2254506,wireframe:!0}));$t.add(Sy);const Ks=new kt(new Ti(Cn.x,Cn.y,Cn.z),new Ai({color:10526880,transparent:!0,opacity:.32}));Ks.name="Static wall collider";Ks.position.set(Rn.x,Rn.y,Rn.z);$t.add(Ks);let Pt=!1;const zr=new di;zr.name="Flair animated collider";zr.visible=Pt;$t.add(zr);let bt=null;const by=cy({parent:zr,sources:[{label:"Flair",url:gy}],targetHeight:fy,floorY:Ka.y,centerX:Ka.x,centerZ:Ka.z,yawRadians:py,animationTimeScale:my,materialIndex:20}).then(i=>(bt=i,console.log(`[example] animated collider: ${i.label}, animation=${i.animationName??"none"}, vertices=${i.vertices.length/3}, triangles=${i.triangles.length}`),i)),Oo=new kt(new $s(.18,16,16),new Ai({color:16729156}));Oo.position.set(_i.x,_i.y,_i.z);$t.add(Oo);const uu=new kt(new $s(.18,16,16),new Ai({color:4521796}));uu.position.set(Dt.x,Dt.y,Dt.z);$t.add(uu);const du=.6,My=new Bh(new P(0,0,-1),new P(Dt.x,Dt.y,Dt.z),du,4491519,.15,.09);$t.add(My);const Ey=new Bh(new P(1,0,0),new P(Dt.x,Dt.y,Dt.z),du,16737894,.15,.09);$t.add(Ey);const ni=new r0(lr,ti.domElement);ni.target.set(Dt.x,Dt.y,Dt.z);ni.mouseButtons={LEFT:null,MIDDLE:kn.DOLLY,RIGHT:kn.ROTATE};ni.enablePan=!1;ni.enableDamping=!0;ni.dampingFactor=.08;ni.minDistance=1;ni.maxDistance=40;const Ay=new Hx;function fu(){requestAnimationFrame(fu);const i=Ay.getDelta();Pt&&(bt==null||bt.advance(i)),ni.update(),ti.render($t,lr)}fu();window.addEventListener("resize",()=>{const i=cu();lr.aspect=i.width/i.height,lr.updateProjectionMatrix(),ti.setSize(i.width,i.height)});const Ns=document.getElementById("roomMat"),nr=document.getElementById("wallMat"),dn=document.getElementById("threadMode"),wn=document.getElementById("start"),Os=document.getElementById("moveToggle"),Bs=document.getElementById("wallToggle"),ks=document.getElementById("flairToggle");{const i=new URLSearchParams(location.search).get("thread");(i==="mt"||i==="st")&&(dn.value=i)}function pu(){return typeof globalThis.SharedArrayBuffer<"u"&&typeof Atomics<"u"}function mu(){return typeof self.crossOriginIsolated=="boolean"&&self.crossOriginIsolated}function gu(){return pu()&&mu()}function mo(){const i=[];return pu()||i.push("SharedArrayBuffer is not available"),mu()||i.push("crossOriginIsolated is false"),i}function _u(){const i=dn.querySelector('option[value="mt"]');if(gu()){i&&(i.disabled=!1),dn.disabled=!1,dn.title="";return}i&&(i.disabled=!0),dn.value="st",dn.disabled=!0,dn.title=`Multi mode unavailable: ${mo().join("; ")}`,console.warn(`[thread-guard] Multi mode unavailable; using Single mode only.
`+mo().join(`
`))}_u();let zs=[],Ji=null,Jt=null,zt=null;function Qc(i,e){i.innerHTML="";for(const t of zs){const n=document.createElement("option");n.value=String(t.materialType),n.textContent=`${t.materialType}: ${t.description}`,i.appendChild(n)}i.value=String(e),i.disabled=!1}(async()=>{try{const i=await fetch("./assets/soundMaterial.json"),{_soundMaterials:e}=await i.json();zs=e,console.log(`[example] loaded ${zs.length} materials`),Qc(Ns,20),Qc(nr,20),wn.disabled=!1}catch(i){console.error("[example] material load failed:",i)}})();Ns.addEventListener("change",()=>{const i=Number(Ns.value);Ji&&(Ji.setMaterial(i),console.log(`[example] room → ${i}`))});nr.addEventListener("change",()=>{const i=Number(nr.value);bt==null||bt.setMaterialIndex(i),Jt&&Jt.setMaterial(i),zt&&zt.setMaterial(i),console.log(`[example] collider material → ${i}`)});const fi={maxDelayRate:.03,pathFadeTime:.066,maxPathDelay:1};let Zn=null,Jn=-1,vs=null;function Ty(i){fi.maxDelayRate=i,Zn&&Jn>=0&&Zn.setMaxDelayRate(Jn,i)}function wy(i){fi.pathFadeTime=i,Zn&&Jn>=0&&Zn.setPathFadeTime(Jn,i)}function Ry(i){fi.maxPathDelay=i,Zn&&Jn>=0&&Zn.setMaxDelay(Jn,i)}const fn={cx:0,cy:_i.y,cz:0,a:4,b:1.66,omega:.45};let Gs=!1;const Zt={..._i};let Za=Math.atan2((_i.z-fn.cz)/fn.b,(_i.x-fn.cx)/fn.a);function xu(){Os.textContent=Gs?"Stop":"Move"}Os.addEventListener("click",()=>{Gs=!Gs,xu()});let gn=!0,qn=null,Er=null,Qi=null,mn=null,Vn=null,Ar=0;function vu(){if(!(mn!=null&&mn.enabled))return;const i=[...gn&&Jt?[Jt]:[],...Pt&&zt?[zt]:[]];i.length>0?mn.updateMany(i):mn.clear()}function yu(){Bs.textContent=gn?"Wall: On":"Wall: Off",Ks.visible=gn,vu()}Bs.addEventListener("click",()=>{gn=!gn,yu(),qn&&Er&&(gn?qn.addObject(Er):qn.removeObject(Er),console.log(`[example] static wall ${gn?"added to":"removed from"} scene`))});function Su(){ks.textContent=Pt?"Anim: On":"Anim: Off",zr.visible=Pt,Pt||(bt==null||bt.pause(),mn==null||mn.clear()),vu()}ks.addEventListener("click",()=>{Pt=!Pt,Pt&&(((Vn==null?void 0:Vn.bvhType)??$n.LBVH)===$n.HKDtree?bt==null||bt.setBindPose():bt==null||bt.play(!0)),Su(),qn&&Qi&&(Pt?(Qi.setUpdateType(Nr.Rebuild),qn.addObject(Qi),Ar=1):(qn.removeObject(Qi),Ar=0),console.log(`[example] Flair ${Pt?"added to":"removed from"} scene`))});wn.addEventListener("click",async()=>{if(vs){vs();return}const i=dn.value==="mt"?"mt":"st",e=i==="mt"&&gu()?"mt":"st";i==="mt"&&e==="st"&&(dn.value="st",console.warn(`[thread-guard] Multi mode unavailable at Start; falling back to Single.
`+mo().join(`
`))),wn.disabled=!0,dn.disabled=!0,wn.textContent="Loading…";const t=navigator;try{t.audioSession&&(t.audioSession.type="playback",console.log(`[diag] audioSession.type=${t.audioSession.type}`))}catch(ce){console.warn("[diag] audioSession playback failed:",ce)}const n=new AudioContext,r=n.resume();console.log(`[diag] ctx.sampleRate=${n.sampleRate}, baseLatency=${n.baseLatency}, state=${n.state}`);const s=new Fo(n,{thread:e,coreBaseUrl:"./core"});await s.load();for(const ce of zs)s.materials.add({reflection:new Float32Array(ce.reflection),absorption:new Float32Array(ce.absorption),transmission:new Float32Array(ce.transmission),scattering:ce.scattering,index:ce.materialType});const a=Number(Ns.value),o=Number(nr.value),l=await by;l.setMaterialIndex(o),Pt&&(l.play(!0),l.sampleVertices(),console.log(`[example] animated collider loop started: ${l.animationName??"none"}`)),Ji=s.createMesh(),Ji.setData($a(0,0,0,ou,No,lu),qa(au,a));const c=s.createObject().setPosition(0,0,0).setMesh(Ji.id);Jt=s.createMesh(),Jt.setData($a(Rn.x,Rn.y,Rn.z,Cn.x,Cn.y,Cn.z),qa(Jc,o),po);const h=s.createObject().setPosition(0,0,0).setMesh(Jt.id);zt=s.createMesh(),zt.setData(l.vertices,l.triangles,{...po});const u=s.createObject().setPosition(0,0,0).setMesh(zt.id),d=s.createScene().addObject(c);gn&&d.addObject(h),Pt&&d.addObject(u),qn=d,Er=h,Qi=u;const f=2,x=128,m=s.createListener(),p=await m.setHRTFFromUrl("./hrtf/hrtf.bytes");console.log("[example] HRTF loaded:",p),m.setOption(O0()),m.setAudioOption({sampleRate:n.sampleRate,inputSampleCount:x,outputChannels:f}),m.setOrientation([1,0,0,0,1,0,0,0,-1]),m.setRayCount(32,32).setRayDepth(7).setPosition(Dt.x,Dt.y,Dt.z);const v={x:.001,y:1,z:0},_=s.createSource().setIntensity(1).setDepth(4).setRayCount(64,64).setGainBoostDb(0).setReverbSendDb(0).setReflectionSendDb(0).setDirection(0,0,-1).setDistanceAttenuation(0,v).setDistanceAttenuation(1,v).setDistanceAttenuation(2,v).setDistanceAttenuation(3,v).setDistanceAttenuation(4,v).setPosition(Zt.x,Zt.y,Zt.z);d.addSource(_).setListener(m),m.setMaxDelayRate(_.id,fi.maxDelayRate),m.setPathFadeTime(_.id,fi.pathFadeTime),m.setMaxDelay(_.id,fi.maxPathDelay),Zn=m,Jn=_.id;let b=!1;const C=()=>{e==="mt"||b||(d.tick(0),d.updatePropagation(),b=!0)},w=await n.decodeAudioData(await(await fetch(_y)).arrayBuffer());let T=()=>{},D=!1;const S=()=>{D||(D=!0,T())};let A=!1;const N=(ce,Me)=>{if(!A){A=!0,console.error(`[example] wasm error during ${ce}; stopping demo loop`,Me);try{S()}catch{}wn.textContent="Engine error"}};e==="st"&&C();const W=await s.createWorkletNode(m,_,f),Z=n.createBufferSource();Z.buffer=w,Z.loop=!0,Z.connect(W),W.connect(s.output),s.output.connect(n.destination),await r,Z.start(),T=()=>{try{Z.stop()}catch{}try{Z.disconnect()}catch{}try{W.disconnect()}catch{}},console.log(`[example] audio path: ${e.toUpperCase()} AudioWorklet (wasm renders on the audio thread)`);const I=new fv(document.body,ln),F=new vv($t),z=new Mv($t);mn=z;let $=!1;const X=new Uo({title:"soundtrace.js demo"});X.domElement.style.setProperty("--width",`${245*ln}px`),X.domElement.style.setProperty("--font-size",`${11*ln}px`),X.domElement.style.setProperty("--input-font-size",`${11*ln}px`),X.domElement.style.setProperty("--padding",`${4*ln}px`),X.domElement.style.setProperty("--spacing",`${4*ln}px`),X.domElement.style.setProperty("--widget-height",`${20*ln}px`),X.domElement.style.setProperty("--name-width","38%"),X.domElement.style.setProperty("--slider-input-width","13.5%"),X.domElement.style.setProperty("--folder-indent",`${7*ln}px`),X.domElement.style.setProperty("--slider-input-min-width",`${45*ln*.5}px`),X.domElement.style.setProperty("--color-input-min-width",`${45*ln}px`),X.domElement.style.setProperty("--scrollbar-width",`${5*ln}px`),hy(X,{listener:m,pathGizmo:F,statsHUD:I}),Jt&&zt&&(Vn=dy(X,{targets:[{mesh:Jt,object:h,isActive:()=>gn,geometryProvider:()=>({vertices:$a(Rn.x,Rn.y,Rn.z,Cn.x,Cn.y,Cn.z),triangles:qa(Jc,Number(nr.value))})},{mesh:zt,object:u,isActive:()=>Pt,geometryProvider:Me=>(l.setMaterialIndex(Number(nr.value)),Me.bvhType===$n.HKDtree?{vertices:l.setBindPose(),triangles:l.triangles}:Pt?(l.play(!1),{vertices:l.sampleVertices(),triangles:l.triangles}):(l.pause(),{vertices:l.vertices,triangles:l.triangles}))}],bvhGizmo:z,onRebuild:()=>{$||d.tick(0)}}).state),uy(X,{state:fi,onMaxDelayRate:Ty,onPathFadeTime:wy,onMaxPathDelay:Ry}),Os.disabled=!1,Bs.disabled=!1,ks.disabled=!1,xu(),yu(),Su();let q=performance.now(),J=0;const oe=16;$=e==="mt"&&s.propagator.startBackgroundLoop(d.id,oe),console.log("[example] propagation thread:",$?"engine pthread (MT)":"main rAF (ST)");let V=0,K=!1;const le=()=>{if(!K){K=!0,V!==0&&cancelAnimationFrame(V),$&&s.propagator.stopBackgroundLoop(),S(),I.dispose(),F.dispose(),z.dispose(),X.destroy();try{s.dispose()}catch{}n.state!=="closed"&&n.close().catch(()=>{}),Ji=null,Jt=null,zt=null,qn=null,Er=null,Qi=null,mn=null,Vn=null,Zn=null,Jn=-1,Os.disabled=!0,Bs.disabled=!0,ks.disabled=!0,wn.textContent="Start Audio",wn.disabled=!1,_u(),vs=null,window.removeEventListener("beforeunload",le),console.log("[example] audio stopped.")}};vs=le,window.addEventListener("beforeunload",le),wn.textContent="Stop Audio",wn.disabled=!1;function _e(){if(!(A||K)){V=requestAnimationFrame(_e),I.begin();try{const ce=performance.now(),Me=(ce-q)/1e3;if(q=ce,Gs&&(Za+=fn.omega*Me,Zt.x=fn.cx+fn.a*Math.cos(Za),Zt.y=fn.cy,Zt.z=fn.cz+fn.b*Math.sin(Za)),Oo.position.set(Zt.x,Zt.y,Zt.z),_.setPosition(Zt.x,Zt.y,Zt.z),Pt&&Ar<=0&&((Vn==null?void 0:Vn.bvhType)??$n.LBVH)===$n.LBVH&&bt&&zt&&(zt.updateVertices(bt.sampleVertices()),zt.refit(),u.setUpdateType(Nr.Refit),z.enabled&&z.updateMany([...gn&&Jt?[Jt]:[],zt])),ce-J>=oe&&($||(d.tick(Me),d.updatePropagation()),Ar>0&&Ar--,J=ce,F.enabled)){const De=m.getPosition();F.update(s.propagator,De,we=>we===_.id?_.getPosition():null)}}catch(ce){N("frame tick",ce)}finally{I.end()}}}_e(),console.log("[example] running. Use Move to toggle source motion, dropdowns to swap material at runtime.")});
