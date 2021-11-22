import React, { useRef, useState, useMemo, useEffect } from "react";
import "./index.css";
import "antd/dist/antd.css";
import {
  Amap,
  Marker,
} from "@amap/amap-react";
import {
  Card,
  Button,
  Input,
  message
} from "antd";
import {
  usePlugins
} from "@amap/amap-react";
import SelectCurrentPlace from './components/SelectCurrentPlace';

export default function App() {
  const $map = useRef(null);
  const AMap = usePlugins(['AMap.PlaceSearch', 'AMap.GeometryUtil']);
  const ps = useMemo(() => {
    if (AMap)
      return new AMap.PlaceSearch({
        city: "上海市"
      });
    else return null;
  }, [AMap]);
  const gu = useMemo(() => {
    if (AMap) {
      return AMap.GeometryUtil;
    }
  }, [AMap])

  const [results, setResults] = useState([]);
  const [hover, setHover] = useState(null);
  const [address, setAddress] = useState([]);
  const [destination, setDestination] = useState('');
  const [renderAddress, setRenderAddress] = useState([]);
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    if (results.length) {
      setRenderAddress(results)
    } else {
      setRenderAddress(address)
    }
  }, [results, address])

  useEffect(() => {
    if (address.length && destination) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [address, destination])

  const startSearching = () => {
    console.log(address);

    if (address.length > 1) {
      let distanceArr = []; // 彼此之间的距离

      for (let i = 0; i < address.length; i++) {
        address.slice(i + 1).forEach(ad => {
          const dis = gu.distance([address[i].location.lng, address[i].location.lat], [ad.location.lng, ad.location.lat]);
          const round = Math.round(dis);
          distanceArr.push(round);
        })
      }
      console.log(distanceArr);

      const maxDistance = Math.max(distanceArr); // 获取彼此之间的最大距离
      console.log(maxDistance);
      address.forEach(ad => {
        ps.searchNearBy(destination, [ad.location.lng, ad.location.lat], maxDistance, (status, result) => {
          console.log(status, result); // 获取了各自在彼此最大距离的范围内的目标地点的数组
          // TODO ...
        })
      })
    } else {
      message.error('请选择至少两个地址');
    }
  }

  return (
    <div className="quick-meet">
      <Amap ref={$map}>
        <div className="quick-meet__card-wrap">
          <SelectCurrentPlace
            $map={$map}
            setResults={setResults}
            address={address}
            setAddress={setAddress}
            hover={hover}
            setHover={setHover}
            ps={ps}
          />

          <Card className="quick-meet__card" title="输入你们的目标场所">
            <Input placeholder="输入你们的目标场所" allowClear onChange={(e) => {
              setDestination(e.target.value);
            }} />
          </Card>

          <Button type="primary" disabled={disabled} onClick={startSearching}>开始搜索</Button>
        </div>


        {renderAddress.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.location.lng, poi.location.lat]}
            label={
              poi === hover
                ? {
                  content: poi.name,
                  direction: "bottom"
                }
                : { content: "" }
            }
            zIndex={poi === hover ? 110 : 100}
            onMouseOver={() => setHover(poi)}
            onMouseOut={() => setHover(null)}
          />
        ))}
      </Amap>
    </div>
  );
}


