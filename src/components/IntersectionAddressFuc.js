import React from 'react';
import { Marker } from '@amap/amap-react';
import marker1 from '../marker-1.svg';

function IntersectionAddressFunc(props) {
  // 这里参考 https://dmitripavlutin.com/dont-overuse-react-usecallback/#3-a-good-use-case
  const { intersectionAddress, hover, setHover, setPath } = props;
  return (
    <>
      {intersectionAddress.map((poi) => (
        <Marker
          icon={marker1}
          offset={[-22, -40]}
          key={poi.id}
          position={[poi.location.lng, poi.location.lat]}
          label={
            poi === hover
              ? {
                  content: poi.name,
                  direction: 'bottom',
                }
              : { content: '' }
          }
          zIndex={poi === hover ? 110 : 100}
          onMouseOver={() => setHover(poi)}
          onMouseOut={() => setHover(null)}
          onClick={() => setPath(poi)}
        />
      ))}
    </>
  );
}

export default React.memo(IntersectionAddressFunc);
