import { useState } from 'react';
import { loadAmap, loadPlugins } from '@amap/amap-react';

export function usePromise(promise, defaultValue = undefined) {
  const [result, setResult] = useState(defaultValue);
  const [error, setError] = useState(null);

  promise.then(setResult, setError);

  return [result, error];
}

export const noop = () => {};

let _citiesPromise = null;
export function loadCities() {
  if (!_citiesPromise) {
    _citiesPromise = loadAmap()
      .then(() => loadPlugins('AMap.DistrictSearch'))
      .then((AMap) => {
        const ds = new AMap.DistrictSearch({
          level: 'country',
          subdistrict: 2,
        });

        return new Promise((resolve) => {
          ds.search('中国', function (status, result) {
            const compare = (a, b) => {
              return parseInt(a.value, 10) - parseInt(b.value, 10);
            };
            const options = result.districtList[0].districtList.map((province) => {
              const { adcode, name, districtList = [] } = province;
              const children = ['北京市', '天津市', '上海市', '重庆市'].includes(name)
                ? []
                : districtList.map((city) => {
                    return {
                      value: city.adcode,
                      label: city.name,
                    };
                  });
              children.sort(compare);
              return {
                value: adcode,
                label: name,
                children,
              };
            });
            options.sort(compare);
            resolve(options);
          });
        });
      });
  }
  return _citiesPromise;
}

export function secondToDate(result) {
  const h = Math.floor(result / 3600);
  const m = Math.floor((result / 60) % 60);
  const s = Math.floor(result % 60);
  return (h && h + '小时') + (m && m + '分钟') + s + '秒';
}
