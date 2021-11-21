import React, { useRef, useState } from "react";
import "./index.css";
import "antd/dist/antd.css";
import {
  Amap,
  Marker,
} from "@amap/amap-react";
import {
  Card,
  Tooltip,
  Button,
  Modal,
  List
} from "antd";
import SearchBox from './components/SearchBox';
import SearchResult from './components/SearchResult';
import SelectCity from './components/SelectCity';
import {
  PlusOutlined
} from '@ant-design/icons';



export default function App() {
  const $map = useRef(null);
  const [mode, setMode] = useState("input");
  const [city, setCity] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [hover, setHover] = useState(null);
  const [searchBoxVisible, setSearchBoxVisible] = useState(false);
  const [address, setAddress] = useState([]);

  const clearSearch = () => {
    setResults([]);
    setHover(null);
  };
  const handleSearch = (query) => {
    setQuery(query);
  };

  return (
    <div className="App">
      <div className="quick-meet">
        <Amap ref={$map}>
          <Card className="quick-meet__card" title="选择你们当前的位置">
            <SelectCity
              city={city}
              onCityChange={(values) => {
                setAddress([]);
                setCity(values);
                $map.current.setCity(values[values.length - 1]);
                setSearchBoxVisible(true);
              }} />
            {address.length > 0 &&
              <List
                dataSource={address}
                locale={""}
                renderItem={(poi) => (
                  <List.Item style={{ cursor: "pointer" }}>
                    <List.Item.Meta title={poi.name} description={poi.address} />
                  </List.Item>
                )}
              />
            }
            {
              city.length > 0 && <Tooltip title="新增地址">
                <Button className="quick-meet__add-address" type="primary" shape="circle" icon={<PlusOutlined />}
                  onClick={() => {
                    setSearchBoxVisible(true);
                  }}
                />
              </Tooltip>
            }
            <Modal visible={searchBoxVisible}
              destroyOnClose={true}
              onCancel={() => {
                setSearchBoxVisible(false);
              }}
              footer={[
                <Button type="primary"
                  onClick={() => {
                    setSearchBoxVisible(false);
                  }}>关闭</Button>
              ]}>
              {mode === "input" &&
                <SearchBox
                  query={query}
                  onSearch={(query) => {
                    clearSearch();
                    handleSearch(query);
                    setMode("result");
                  }}
                  city={city}
                />
              }
              {mode === "result" && (
                <SearchResult
                  city={city[city.length - 1]}
                  query={query}
                  onClose={() => {
                    clearSearch();
                    setMode("input");
                  }}
                  onResult={(results) => {
                    setResults(results);
                    if ($map.current) {
                      setTimeout(() => {
                        $map.current.setFitView(null, false, [40, 10, 310, 20]);
                      }, 100);
                    }
                  }}
                  onSelect={(poi) => {
                    setHover(poi);
                    setAddress(oldVal => [...oldVal, poi])
                    setSearchBoxVisible(false);
                    if ($map.current) {
                      $map.current.setZoomAndCenter(
                        17,
                        [poi.location.lng, poi.location.lat],
                        true
                      );
                    }
                    clearSearch();
                    setMode("input");
                  }}
                />
              )}
            </Modal>

          </Card>


          {results.map((poi) => (
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
    </div>
  );
}


