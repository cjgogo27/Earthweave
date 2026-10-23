"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Language = 'zh' | 'en';
const ERRORS: Record<string,string> = {
 '来源链接格式不正确。':'The source URL has an invalid format.',
 '请输入完整的 HTTPS 影像直链。':'Enter a complete HTTPS direct image or video URL.',
 '来源链接需要使用 HTTPS 默认端口，且不能包含用户名或密码。':'Use an HTTPS URL on the default port, without a username or password.',
 '请输入影像直链。':'Enter a direct media URL.',
 '服务器目前支持 Poly Haven、Wikimedia、Unsplash 和 Pexels 的指定媒体域名直链。其他来源可尝试浏览器导入，或下载后上传。':'Server imports support designated media domains from Poly Haven, Wikimedia, Unsplash and Pexels. For other sources, try browser import or download the file and upload it.',
 '影像链接重定向过多或缺少目标地址，请使用最终媒体直链。':'Too many redirects or a missing destination. Use the final direct media URL.',
 '影像链接返回了无效的重定向。':'The media URL returned an invalid redirect.',
 '远程文件过大，最多支持 32 MB。':'The remote file exceeds the 32 MB limit.',
 '无法下载媒体。':'The media could not be downloaded.',
 '下载超时，请选择更小的文件或先下载到设备后上传。':'The download timed out. Use a smaller file or download it to your device before uploading.',
 '无法连接媒体来源，请检查直链，或下载文件后上传。':'The media source could not be reached. Check the direct URL or download the file and upload it.',
 '链接导入需要 JSON 格式。':'URL imports require JSON.',
 '导入信息格式不正确。':'The import details have an invalid format.',
 '请填写有效的经纬度。':'Enter valid latitude and longitude.',
 '纬度应在 -90 到 90 之间。':'Latitude must be between −90 and 90.',
 '经度应在 -180 到 180 之间。':'Longitude must be between −180 and 180.',
 '不支持的影像类型。':'This media type is not supported.',
 '请选择支持的授权方式。':'Choose a supported sharing license.',
 '请确认你有权上传并授权这些影像。':'Confirm that you have the right to upload and license this media.',
 '无法读取 JPEG 尺寸，请重新导出图片。':'The JPEG dimensions could not be read. Export the image again.',
 '仅支持有效的 JPEG、PNG、WebP、MP4 或 WebM 文件。':'Only valid JPEG, PNG, WebP, MP4 and WebM files are supported.',
 '所选影像类型与文件内容不一致。':'The selected media type does not match this file.',
 '图片尺寸无效或过大，请缩小至 16384 像素以内、8000 万像素以下。':'Invalid or oversized image. Use at most 16,384 pixels per side and 80 megapixels.',
 '360° 全景需要约 2:1 比例的等距柱状投影图片，普通照片请选择「照片」。':'A 360° panorama needs a 2:1 equirectangular image. Choose Photo for ordinary images.',
 '无效的媒体范围。':'Invalid media byte range.',
 '影像存储尚未连接，请稍后重试。':'Media storage is not connected. Try again later.',
 '服务暂时不可用，请稍后重试。':'The service is temporarily unavailable. Try again later.',
 '请从本站页面提交操作。':'Submit this action from the Earthweave website.',
 '浏览器会话尚未准备好或已过期，请刷新页面后重试。':'This browser session is not ready or has expired. Refresh the page and try again.',
 '无法准备浏览器会话，请允许 Cookie 并重试。':'The browser session could not be prepared. Allow cookies and try again.',
 '找不到这条影像。':'This media record could not be found.',
 '文件过大，单次上传最多 32 MB。':'The upload is too large. The limit is 32 MB.',
 '请求没有内容。':'The request body is empty.',
 '请求内容过大。':'The request body is too large.',
 '分页参数无效。':'Invalid page cursor.',
 '上传需要 multipart/form-data 格式。':'Uploads require multipart/form-data.',
 '每小时最多上传 20 条影像，请稍后再试。':'You can upload up to 20 records per hour. Try again later.',
 '无法读取上传内容，请重新选择文件。':'The upload could not be read. Select the file again.',
 '请选择一个影像文件。':'Select an image or video file.',
 '文件内容为空。':'The file is empty.',
 '文件过大，单个文件最多 32 MB。':'Each file must be 32 MB or smaller.',
 '这份影像已经上传过了。':'You have already uploaded this media.',
 '只能删除自己上传的影像。':'You can only delete your own uploads.',
 '举报内容格式不正确。':'Invalid report format.',
};
const FIELD_NAMES:Record<string,string>={'影像类型':'Media type','授权方式':'License','地点名称':'Place name','描述':'Description','采集设备':'Capture device','举报原因':'Report reason','来源链接':'Source URL','导入链接':'Import URL','原作者或来源署名':'Original creator or source attribution'};
function englishError(message:string){
 if(ERRORS[message]) return ERRORS[message];
 const remoteStatus=message.match(/^来源站点未提供可下载的完整影像（HTTP (\d+)）。请检查直链和访问权限。$/);
 if(remoteStatus)return `The source did not provide a complete media file (HTTP ${remoteStatus[1]}). Check the direct URL and access permissions.`;
 for(const [zh,en] of Object.entries(FIELD_NAMES)){
  if(message===`请填写${zh}。`)return `${en} is required.`;
  if(message===`${zh}格式不正确。`)return `${en} has an invalid format.`;
  const max=message.match(new RegExp(`^${zh}不能超过 (\\d+) 个字符。$`));
  if(max)return `${en} must be no more than ${max[1]} characters.`;
 }
 return message;
}
const Context=createContext<{language:Language;setLanguage:(language:Language)=>void;t:(zh:string,en?:string)=>string}>({language:'zh',setLanguage:()=>{},t:zh=>zh});

export function I18nProvider({children}:{children:ReactNode}){
 const [language,setLanguageState]=useState<Language>('zh');
 useEffect(()=>{try{const value=localStorage.getItem('earthweave-language');if(value==='en'||value==='zh')setLanguageState(value);}catch{}},[]);
 const setLanguage=useCallback((value:Language)=>{setLanguageState(value);try{localStorage.setItem('earthweave-language',value);}catch{}},[]);
 useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=language==='en'?'Earthweave · A world we build together':'共境 Earthweave · 一起构建可体验的地球';},[language]);
 const t=useCallback((zh:string,en?:string)=>language==='zh'?zh:en??englishError(zh),[language]);
 const value=useMemo(()=>({language,setLanguage,t}),[language,setLanguage,t]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useI18n=()=>useContext(Context);
