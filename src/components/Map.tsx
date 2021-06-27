import React from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

declare global {
  interface Window {
    AMap: () => void;
  }
}

export default function Map() {
  AMapLoader.load({
    key: '8331532e931a9af572b0409028801e6b', // 申请好的Web端开发者Key，首次调用 load 时必填
    version: '1.4.15', // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
    plugins: [], // 需要使用的的插件列表，如比例尺'AMap.Scale'等
    AMapUI: {
      // 是否加载 AMapUI，缺省不加载
      version: '1.1', // AMapUI 缺省 1.1
      plugins: [], // 需要加载的 AMapUI ui插件
    },
    Loca: {
      // 是否加载 Loca， 缺省不加载
      version: '1.3.2', // Loca 版本，缺省 1.3.2
    },
  })
    .then((AMap) => {
      const aMap = new AMap.Map('quick-meet');
    })
    .catch((e) => {
      console.log(e);
    });

  return <div id="quick-meet"></div>;
}
