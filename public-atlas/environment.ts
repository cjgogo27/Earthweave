// Local simulation time: phase zero is noon; one orbit takes three minutes.
export const DAY_SECONDS=180, WEATHER_SECONDS=100;
export const phases=[0,.24,.50,.76] as const;
export const forecasts=[0,.27,.56,.84] as const;
export function band(value:number,stops:readonly number[]){
 let i=stops.length-1;while(i>0&&value<stops[i])i--;
 const t=(value-stops[i])/((stops[i+1]??1)-stops[i]);
 return {i,j:(i+1)%stops.length,t:t*t*(3-2*t)};
}
export function climate(clock:number,weather:number){
 const p=band(clock,phases),w=band(weather,forecasts);
 const mix=(a:readonly number[],b:typeof p)=>a[b.i]+(a[b.j]-a[b.i])*b.t;
 return {sun:p,daylight:mix([1,.38,0,.34],p),rain:mix([0,0,1,.22],w),cloud:mix([0,.82,1,.32],w),weather:w.t<.5?w.i:w.j,light:p.t<.5?p.i:p.j};
}
export function advance(value:number,seconds:number,period:number){return (value+seconds/period)%1}
