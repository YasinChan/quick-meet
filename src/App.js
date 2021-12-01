import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import './index.css';
import 'antd/dist/antd.css';
import { Amap, Marker } from '@amap/amap-react';
import { Button, Input, message, Collapse, List, Slider, Row, Col, Card, Popover, Select } from 'antd';
import { usePlugins } from '@amap/amap-react';
import SelectCurrentPlace from './components/SelectCurrentPlace';
import { QuestionCircleOutlined } from '@ant-design/icons';
import marker1 from './marker-1.svg';
import marker2 from './marker-2.svg';
import queryString from 'query-string';

// 点击目标场所的标识按钮需要各个用户当前位置到标识处的路径信息，
// 但发现 AMap.Transfer 方法一个实例只能绘制一条路径，所以需要多个实例，同时用完即销毁。
let tfArr = [];
export default function App() {
  const { Panel } = Collapse;
  const { Option } = Select;

  const [infoPopover, setInfoPopover] = useState(false); // 选择范围倍数的 info
  const [distanceRatio, setDistanceRatio] = useState(1); // 选择范围倍数的
  const [policy, setPolicy] = useState(0); // 公交换乘策略 map

  const [hover, setHover] = useState(null); // 标记的 hover
  const [address, setAddress] = useState([]); // 选择的当前位置地址
  const [destination, setDestination] = useState(''); // 目的地
  const [disabled, setDisabled] = useState(true); // 开始搜索按钮的置灰
  const [city, setCity] = useState([]); // 设置的城市
  const [intersectionAddress, setIntersectionAddress] = useState([]); // 结果中有交集的场所
  const [circleOverly, setCircleOverly] = useState([]); // 所有的圆形覆盖物
  const [activeKey, setActiveKey] = useState(['1']); // 折叠面板中需要展开的部分
  const [transferPolicy, setTransferPolicy] = useState([]); // 公交换乘策略 map

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
        pageSize: 50,
        citylimit: true,
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

      const search = window.location.search;
      const parsed = queryString.parse(search, { arrayFormat: 'bracket' });

      const {
        city: cityM,
        addressId: addressIdM,
        destination: destinationM,
        distanceRatio: distanceRatioM,
        policy: policyM,
      } = parsed;
      if (cityM && addressIdM) {
        setCity(cityM);
        const pArr = [];
        addressIdM.split(',').forEach((addId) => {
          pArr.push(
            new Promise((res, rej) => {
              ps.getDetails(addId, (status, result) => {
                if (status === 'complete') {
                  res(result.poiList.pois[0]);
                }
              });
            }),
          );
        });
        Promise.all(pArr).then((res) => {
          setAddress(res);
          setDestination(destinationM);
          setDistanceRatio(Number(distanceRatioM));
          setPolicy(policyM);
          message.success('请确认信息后点击开始搜索');
        });
      }
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

  const [a, setA] = useState([]);

  const startSearching = () => {
    $map.current.remove(circleOverly); // 开始搜索时，清空所有圆形的覆盖物
    setCircleOverly([]);
    setIntersectionAddress([]); // 交集也清空
    if (address.length > 1) {
      const addressIdArr = [];

      let distanceArr = []; // 彼此之间的距离

      for (let i = 0; i < address.length; i++) {
        addressIdArr.push(address[i].id);
        address.slice(i + 1).forEach((ad) => {
          const dis = gu.distance(
            [address[i].location.lng, address[i].location.lat],
            [ad.location.lng, ad.location.lat],
          );
          const round = Math.round(dis);
          distanceArr.push(round);
        });
      }

      const addressIdArrValue = addressIdArr.join(',');

      const maxDistance = Math.max(...distanceArr); // 获取彼此之间的最大距离
      const promiseArr = []; // 由于搜索是异步的，所以需要在全部搜索完成后进行后续操作

      // PlaceSearch 的 searchNearBy 方法一次只能搜索一页最多 50 条数据，这里有可能会有大于 50 条，所以这里使用递归查询所有地点
      // TODO 设置一个最大页数，避免特别多的值导致搜索结果太大。
      function searchNearBy(destination, ad, distance, pageIndex = 1, arr = []) {
        // 这里要设置 pageIndex，所以需要每个是单独实例避免污染。
        let ap = new AMap.PlaceSearch({
          city: city,
          pageSize: 50,
          citylimit: true,
        });
        return new Promise((res) => {
          ap.setPageIndex(pageIndex);
          ap.searchNearBy(destination, [ad.location.lng, ad.location.lat], distance, (status, result) => {
            if (status === 'complete') {
              const poiList = result.poiList;
              if (poiList.count > poiList.pageIndex * poiList.pageSize) {
                arr.push(...poiList.pois);
                res(searchNearBy(destination, ad, distance, poiList.pageIndex + 1, arr));
              } else {
                arr.push(...poiList.pois);
                res(arr);
              }
            } else {
              res(arr);
            }
          });
        });
      }

      address.forEach((ad, index) => {
        promiseArr.push(
          new Promise((res, rej) => {
            searchNearBy(destination, ad, maxDistance * distanceRatio, 1, []).then((r) => {
              if (r && r.length) {
                res({ result: r, address: ad });
              }
            });
          }),
        );
      });

      Promise.all(promiseArr).then((res) => {
        debugger;
        const url = queryString.stringifyUrl(
          {
            url: window.location.pathname,
            query: {
              city,
              policy,
              destination,
              distanceRatio,
              addressId: addressIdArrValue,
            },
          },
          { arrayFormat: 'bracket' },
        );

        window.history.replaceState({ url: url, title: document.title }, document.title, url);

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

          setA((o) => [...o, ...result]);
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

  useEffect(() => {
    console.log('a', a);
  }, [a]);

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
            <Panel
              className="quick-meet__collapse-panel"
              header={<span className="quick-meet__collapse-panel-title">Quick Meet</span>}
              key="1"
            >
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
                  value={destination}
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
            icon={marker2}
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
          />
        ))}

        {a.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.location.lng, poi.location.lat]}
            style={{ opacity: '0.4' }}
            className="aaaaaa"
            children={<img width="19px" height="32px" src="//webapi.amap.com/theme/v1.3/markers/b/mark_bs.png" />}
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
      </Amap>
    </div>
  );
}
