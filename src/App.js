import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import './index.css';
import 'antd/dist/antd.css';
import { Amap, Marker } from '@amap/amap-react';
import { Button, Input, message, Collapse, List, Slider, Row, Col, Card, Popover, Select } from 'antd';
import { usePlugins } from '@amap/amap-react';
import SelectCurrentPlace from './components/SelectCurrentPlace';
import { QuestionCircleOutlined } from '@ant-design/icons';

// 点击目标场所的标识按钮需要各个用户当前位置到标识处的路径信息，
// 但发现 AMap.Transfer 方法一个实例只能绘制一条路径，所以需要多个实例，同时用完即销毁。
let tfArr = [];
export default function App() {
  const { Panel } = Collapse;
  const { Option } = Select;

  const [infoPopover, setInfoPopover] = useState(false); // 标记的 hover
  const [distanceRatio, setDistanceRatio] = useState(1); // 标记的 hover

  const [hover, setHover] = useState(null); // 标记的 hover
  const [address, setAddress] = useState([]); // 选择的当前位置地址
  const [destination, setDestination] = useState(''); // 目的地
  const [disabled, setDisabled] = useState(true); // 开始搜索按钮的置灰
  const [city, setCity] = useState([]); // 设置的城市
  const [intersectionAddress, setIntersectionAddress] = useState([]); // 结果中有交集的场所
  const [circleOverly, setCircleOverly] = useState([]); // 所有的圆形覆盖物
  const [activeKey, setActiveKey] = useState(['1']); // 折叠面板中需要展开的部分
  const [transferPolicy, setTransferPolicy] = useState([]); // 公交换乘策略 map
  const [policy, setPolicy] = useState(0); // 公交换乘策略 map

  const AMap = usePlugins(['AMap.PlaceSearch', 'AMap.GeometryUtil', 'AMap.Circle', 'AMap.Transfer']);
  const $map = useRef(null);

  // const tf = useMemo(() => {
  //   if (AMap && $map.current) {
  //     return new AMap.Transfer({
  //       city: '上海市',
  //       map: $map.current,
  //       isOutline: false,
  //       policy: AMap.TransferPolicy.LEAST_TIME,
  //     });
  //   }
  // }, [AMap]);
  const ps = useMemo(() => {
    // 搜索
    if (AMap) {
      return new AMap.PlaceSearch({
        city: '上海市',
        pageSize: 100,
      });
    } else {
      return null;
    }
  }, [AMap]);
  const gu = useMemo(() => {
    // 高德地图提供的函数方法
    if (AMap) {
      return AMap.GeometryUtil;
    }
  }, [AMap]);

  useEffect(() => {
    if (AMap) {
      setPolicy(AMap.TransferPolicy.LEAST_TIME);
      setTransferPolicy([
        {
          title: '最快捷模式',
          value: AMap.TransferPolicy.LEAST_TIME,
        },
        {
          title: '最经济模式',
          value: AMap.TransferPolicy.LEAST_FEE,
        },
        {
          title: '最少换乘模式',
          value: AMap.TransferPolicy.LEAST_TRANSFER,
        },
        {
          title: '最少步行模式',
          value: AMap.TransferPolicy.LEAST_WALK,
        },
        {
          title: '最舒适模式',
          value: AMap.TransferPolicy.MOST_COMFORT,
        },
        {
          title: '不乘地铁模式',
          value: AMap.TransferPolicy.NO_SUBWAY,
        },
      ]);
    }
  }, [AMap]);

  useEffect(() => {
    if ($map.current) {
      setTimeout(() => {
        $map.current.setFitView(null, false, [40, 10, 310, 20]);
      }, 100);
    }
  }, [address]);
  useEffect(() => {
    if (address.length && destination) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [address, destination]);

  const startSearching = () => {
    $map.current.remove(circleOverly); // 开始搜索时，清空所有圆形的覆盖物
    setCircleOverly([]);
    setIntersectionAddress([]); // 交集也清空
    if (address.length > 1) {
      let distanceArr = []; // 彼此之间的距离

      for (let i = 0; i < address.length; i++) {
        address.slice(i + 1).forEach((ad) => {
          const dis = gu.distance(
            [address[i].location.lng, address[i].location.lat],
            [ad.location.lng, ad.location.lat],
          );
          const round = Math.round(dis);
          distanceArr.push(round);
        });
      }

      const maxDistance = Math.max(...distanceArr); // 获取彼此之间的最大距离
      const promiseArr = []; // 由于搜索是异步的，所以需要在全部搜索完成后进行后续操作
      ps.setPageSize(100); // 设置在开始搜索时的搜索量
      address.forEach((ad, index) => {
        promiseArr.push(
          new Promise((res, rej) => {
            ps.searchNearBy(
              destination,
              [ad.location.lng, ad.location.lat],
              maxDistance * distanceRatio,
              (status, result) => {
                res({ result: result.poiList ? result.poiList.pois : [], address: ad });
              },
            );
          }),
        );
      });
      Promise.all(promiseArr).then((res) => {
        let poisInfo = [];
        res.forEach((r) => {
          // 各个用户到目标场所的路径取交集，最终在页面上呈现的即都在圆的交集处。
          const { result, address } = r;
          let circle = new AMap.Circle({
            center: [address.location.lng, address.location.lat], // 圆心位置
            radius: maxDistance * distanceRatio, // 圆半径
            fillColor: '#1791fc', // 圆形填充颜色
            fillOpacity: 0.1,
            strokeColor: '#fff', // 描边颜色
            strokeWeight: 1, // 描边宽度
          });
          $map.current.add(circle);
          setCircleOverly((oldArray) => [...oldArray, circle]);

          if (poisInfo.length) {
            poisInfo = poisInfo.filter((n) => result.some((p) => p.id === n.id));
          } else {
            poisInfo = result;
          }
        });
        setIntersectionAddress(poisInfo);
        setTimeout(() => {
          $map.current.setFitView(null, false, [40, 10, 310, 20]);
        }, 100);
      });
    } else {
      message.error('请选择至少两个地址');
    }
  };

  const setPath = useCallback(
    (poi) => {
      if (tfArr.length) {
        tfArr.forEach((t) => {
          t.clear();
        });
        tfArr = [];
      }
      address.forEach((ad) => {
        const tf = new AMap.Transfer({
          city: '上海市',
          map: $map.current,
          isOutline: false,
          autoFitView: false,
          policy: policy,
        });
        tf.search([ad.location.lng, ad.location.lat], [poi.location.lng, poi.location.lat], (status, result) => {
          console.log('----------', 'status, result', status, result, '----------cyy log');
        });
        tfArr.push(tf);
      });
    },
    [address, policy],
  );

  return (
    <div className="quick-meet">
      <Amap ref={$map}>
        <div className="quick-meet__card-wrap">
          <Collapse bordered={false} defaultActiveKey={activeKey}>
            <Panel header="Quick Meet" key="1">
              <Card className="quick-meet__card" title="选择你们当前的位置" bordered={false}>
                <SelectCurrentPlace
                  $map={$map}
                  address={address}
                  city={city}
                  setCity={setCity}
                  setIntersectionAddress={setIntersectionAddress}
                  setAddress={setAddress}
                  hover={hover}
                  setHover={setHover}
                  ps={ps}
                />
              </Card>

              <Card className="quick-meet__card" title="输入你们的目标场所" bordered={false}>
                <Input
                  placeholder="输入你们的目标场所"
                  allowClear
                  onChange={(e) => {
                    setDestination(e.target.value);
                  }}
                />
              </Card>

              {intersectionAddress.length > 0 && (
                <Card className="quick-meet__card" title="搜索结果" bordered={false}>
                  <List
                    dataSource={intersectionAddress}
                    locale={''}
                    renderItem={(poi) => (
                      <List.Item style={{ cursor: 'pointer' }}>
                        <List.Item.Meta
                          onMouseOver={() => setHover(poi)}
                          onMouseOut={() => setHover(null)}
                          onClick={() => setPath(poi)}
                          title={poi.name}
                          description={poi.address}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </Panel>
          </Collapse>

          <Row align="middle" className="quick-meet__row">
            <Col span={8}>
              选择范围倍数
              <Popover
                content={
                  <span className="quick-meet__popover-content">
                    搜索范围界定规则：以选择的当前位置之间的最大距离为半径的圆，在交集处选择的目标场所。默认半径为一倍大小，可选范围为
                    [1, 2]。
                  </span>
                }
                trigger="click"
                visible={infoPopover}
                onVisibleChange={(v) => {
                  setInfoPopover(v);
                }}
              >
                <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
              </Popover>
            </Col>
            <Col span={12}>
              <Slider
                min={1}
                max={2}
                step={0.1}
                value={distanceRatio}
                onChange={(v) => {
                  setDistanceRatio(v);
                }}
              />
            </Col>
            <Col span={4}>{distanceRatio} 倍</Col>
          </Row>

          <Row align="middle" className="quick-meet__row">
            <Col span={8}>选择公交换乘策略</Col>
            <Col span={12}>
              {transferPolicy.length > 0 && (
                <Select
                  defaultValue={transferPolicy[0].value}
                  style={{ width: 120 }}
                  onChange={(v) => {
                    setPolicy(v);
                  }}
                >
                  {transferPolicy.map((p) => (
                    <Option key={p.value} value={p.value}>
                      {p.title}
                    </Option>
                  ))}
                </Select>
              )}
            </Col>
          </Row>

          <Button className="quick-meet__search-btn" type="primary" disabled={disabled} onClick={startSearching}>
            开始搜索
          </Button>
          <span className="quick-meet__paragraph--small">*调整以上的选项后需再次点击搜索</span>
        </div>

        {address.map((poi) => (
          <Marker
            icon="https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png"
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
          />
        ))}

        {intersectionAddress.map((poi) => (
          <Marker
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
      </Amap>
    </div>
  );
}
