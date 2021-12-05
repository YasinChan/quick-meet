import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import './index.css';
import 'antd/dist/antd.css';
import { Amap, Marker } from '@amap/amap-react';
import {
  Button,
  Input,
  message,
  List,
  Slider,
  Row,
  Col,
  Card,
  Popover,
  Select,
  Switch,
  Modal,
  notification,
} from 'antd';
import { usePlugins } from '@amap/amap-react';
import SelectCurrentPlace from './components/SelectCurrentPlace';
import { QuestionCircleOutlined, RightOutlined, InfoCircleOutlined, CopyOutlined } from '@ant-design/icons';
import marker1 from './marker-1.svg';
import marker2 from './marker-2.svg';
import queryString from 'query-string';
import { listDeDuplication, secondToDate } from './utils/common';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import IntersectionAddressFunc from './components/IntersectionAddressFuc';

const MAX_SEARCH_PAGE = 3; // 最大搜索页数。searchNearBy 方法一次只能搜索一页最多 50 条数据，这里设置最大页数，防止加载太多。
// 点击目标场所的标识按钮需要各个用户当前位置到标识处的路径信息，
// 但发现 AMap.Transfer 方法一个实例只能绘制一条路径，所以需要多个实例，同时用完即销毁。
let tfArr = [];
export default function App() {
  const { Option } = Select;

  const [isLoading, setIsLoading] = useState(false); // 是否正在搜索
  const [isHeaderActive, setIsHeaderActive] = useState(true); // 是否展开
  const [isShowInfoModal, setIsShowInfoModal] = useState(false); //
  const [isShowFinal, setIsShowFinal] = useState(false); //
  const [currentSelectAddress, setCurrentSelectAddress] = useState(''); // 点击开始搜索后，点击地图标记时此处的地址
  const [currentRoutePlan, setCurrentRoutePlan] = useState([]); // 点击开始搜索后，点击地图标记时此时的路径规划

  const [infoPopover, setInfoPopover] = useState(false); // 选择范围倍数的 info
  const [distanceRatio, setDistanceRatio] = useState(1); // 选择范围倍数的
  const policy = useRef(); // 公交换乘策略 value
  // 注：这里使用 useRef 的原因在于，policy 需要在 setPath 中频繁使用，state 在 useCallback 中存在在某些情况无法更新的情况 参考：https://zhuanlan.zhihu.com/p/56975681
  const [policyTitle, setPolicyTitle] = useState(''); // 公交换乘策略 title
  const [isShowAllAddress, setIsShowAllAddress] = useState(false); // 是否展示所有地址

  const [hover, setHover] = useState(null); // 标记的 hover
  const [address, setAddress] = useState([]); // 选择的当前位置地址
  const [destination, setDestination] = useState(''); // 目的地
  const [disabled, setDisabled] = useState(true); // 开始搜索按钮的置灰
  const [city, setCity] = useState([]); // 设置的城市
  const [intersectionAddress, setIntersectionAddress] = useState([]); // 结果中有交集的场所
  const [circleOverly, setCircleOverly] = useState([]); // 所有的圆形覆盖物
  const [activeKey, setActiveKey] = useState(['1']); // 折叠面板中需要展开的部分
  const [transferPolicy, setTransferPolicy] = useState([]); // 公交换乘策略 map

  const AMap = usePlugins(['AMap.CallAMap', 'AMap.PlaceSearch', 'AMap.GeometryUtil', 'AMap.Circle', 'AMap.Transfer']);
  const $map = useRef(null);

  const ac = useMemo(() => {
    if (AMap) {
      // 抓取了源码发现了这个方法，起到和 v1.4 中的 searchOnAMAP 方法类似的效果
      return new AMap.CallAMap();
    }
  }, [AMap]);
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
      policy.current = AMap.TransferPolicy.LEAST_TIME;
      setPolicyTitle('最快捷模式');
      const tpList = [
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
      ];
      setTransferPolicy(tpList);

      const search = window.location.search;
      const parsed = queryString.parse(search, { arrayFormat: 'bracket', parseBooleans: true });

      const {
        city: cityM,
        addressId: addressIdM,
        destination: destinationM,
        distanceRatio: distanceRatioM,
        showAllAddress: showAllAddressM,
      } = parsed;
      if (cityM && addressIdM && destinationM && distanceRatioM && typeof showAllAddressM === 'boolean') {
        setCity(cityM);
        setIsShowAllAddress(showAllAddressM);
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
          notification.open({
            message: '提示',
            description: '搜索信息已自动填入，请确认后点击“开始搜索”按钮。',
            icon: <InfoCircleOutlined style={{ color: '#108ee9' }} />,
          });
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
  useEffect(() => {
    if (isShowAllAddress) {
    }
  }, [isShowAllAddress]);

  const [allAddress, setAllAddress] = useState([]); // 记录下所有搜到的地址

  const copySuccessNotification = () => {
    notification.open({
      message: '提示',
      description: '已复制！',
      duration: 2,
      icon: <InfoCircleOutlined style={{ color: '#108ee9' }} />,
    });
  };

  const startSearching = () => {
    tfArr.forEach((t) => {
      t.clear();
    });
    tfArr = [];
    setIsLoading(true);
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
                if (poiList.pageIndex >= MAX_SEARCH_PAGE) {
                  notification.open({
                    message: '提示',
                    duration: 10,
                    description: '目标场所的搜索结果过多，仅能展示部分结果，请填写更加详细的目标名称或缩小搜索范围。',
                    icon: <InfoCircleOutlined style={{ color: '#108ee9' }} />,
                    placement: 'bottomRight',
                  });
                  res(arr);
                } else {
                  res(searchNearBy(destination, ad, distance, poiList.pageIndex + 1, arr));
                }
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
        const url = queryString.stringifyUrl(
          {
            url: window.location.pathname,
            query: {
              city,
              destination,
              distanceRatio,
              showAllAddress: isShowAllAddress,
              addressId: addressIdArrValue,
            },
          },
          { arrayFormat: 'bracket', parseBooleans: true },
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

          if (isShowAllAddress) {
            setAllAddress((o) => {
              const list = listDeDuplication(o, result, 'id');
              return [...o, ...list];
            });
          }
          if (poisInfo.length) {
            poisInfo = poisInfo.filter((n) => result.some((p) => p.id === n.id));
          } else {
            poisInfo = result;
          }
        });

        setIntersectionAddress(poisInfo);
        setTimeout(() => {
          setIsLoading(false);
          setIsHeaderActive(false);
          notification.open({
            message: '提示',
            duration: 10,
            description: (
              <span>
                路线规划已生成，请点击地图中的<span style={{ fontWeight: 'bold' }}>绿色点标记</span>获得详细路线规划。
                <br />
                分享链接已生成，
                <CopyToClipboard text={window.location.href} onCopy={copySuccessNotification}>
                  <span style={{ color: '#108ee9', cursor: 'pointer' }}>点击</span>
                </CopyToClipboard>
                复制链接。
              </span>
            ),
            icon: <InfoCircleOutlined style={{ color: '#108ee9' }} />,
          });
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
      setCurrentRoutePlan([]);
      address.forEach((ad) => {
        const tf = new AMap.Transfer({
          city: '上海市',
          map: $map.current,
          isOutline: false,
          autoFitView: false,
          policy: policy.current,
        });
        tf.search([ad.location.lng, ad.location.lat], [poi.location.lng, poi.location.lat], (status, result) => {
          setCurrentSelectAddress(poi.name);
          setCurrentRoutePlan((o) => [
            ...o,
            {
              start: ad,
              end: poi,
              result: result,
              tf: tf,
            },
          ]);
          setIsShowFinal(true);
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
          <div
            className={'quick-meet__card-header' + (isHeaderActive ? '' : ' quick-meet__card-header--active')}
            onClick={() => {
              setIsHeaderActive(!isHeaderActive);
            }}
          >
            <RightOutlined className="quick-meet__card-header-icon" />
            <span className="quick-meet__card-header-tip">{isHeaderActive ? '点击收起' : '点击展开'}</span>
            <span className="quick-meet__card-header-title">Quick Meet</span>
            <InfoCircleOutlined
              style={{ marginLeft: '10px', fontSize: '18px' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsShowInfoModal(true);
              }}
            />
          </div>
          <Modal
            visible={isShowInfoModal}
            destroyOnClose={true}
            title="这是一个可以快速找到聚会地点的网站！"
            onCancel={() => {
              setIsShowInfoModal(false);
            }}
            footer={[]}
          >
            <span>你只需要输入你与你的伙伴的位置以及想要去的场所，这个网站将找到所有合适的具体位置供你们参考。</span>
            <br />
            <br />
            源码请查看
            <a href="https://github.com/YasinChan/quick-meet" target="_blank">
              GitHub
            </a>
            。
          </Modal>
          <div className={'quick-meet__card-info ' + (isHeaderActive ? '' : 'quick-meet__card-info--active')}>
            <Card className="quick-meet__card" title="选择你们当前的位置">
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

            <Card className="quick-meet__card" title="输入你们的目标场所">
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
              <Card className="quick-meet__card" title="搜索结果">
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
          </div>

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
            <Col span={10}>
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
            <Col span={6}>{distanceRatio} 倍</Col>
          </Row>

          <Row align="middle" className="quick-meet__row">
            <Col span={8}>是否展示所有搜索到的地址</Col>
            <Col span={10}>
              <Switch
                checkedChildren="开启"
                unCheckedChildren="关闭"
                checked={isShowAllAddress}
                onChange={(isCheck) => {
                  setIsShowAllAddress(isCheck);
                }}
              />
            </Col>
          </Row>

          <Button
            className="quick-meet__search-btn"
            loading={isLoading}
            type="primary"
            disabled={disabled}
            onClick={startSearching}
          >
            开始搜索
          </Button>
          <span className="quick-meet__paragraph--small">*调整以上的选项后需再次点击搜索</span>

          {intersectionAddress.length > 0 && (
            <Row align="middle" className="quick-meet__row">
              <Col span={6}>选择公交换乘策略</Col>
              <Col span={10}>
                {transferPolicy.length > 0 && (
                  <Select
                    defaultValue={transferPolicy[0].value}
                    style={{ width: 120 }}
                    onChange={(v) => {
                      policy.current = v;
                      const tp = transferPolicy.filter((t) => Number(t.value) === Number(v));
                      setPolicyTitle(tp[0].title);
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
              <Col span={8}>
                <span className="quick-meet__paragraph--small">*切换策略后请重新点击绿色点标记</span>
              </Col>
            </Row>
          )}
        </div>

        {isShowAllAddress &&
          allAddress.map((poi) => (
            <Marker
              key={poi.id + '_all_address'}
              position={[poi.location.lng, poi.location.lat]}
              style={{ opacity: '0.5' }}
              children={<img width="19px" height="32px" src="//webapi.amap.com/theme/v1.3/markers/b/mark_bs.png" />}
              label={
                poi === hover
                  ? {
                      content: poi.name,
                      direction: 'bottom',
                    }
                  : { content: '' }
              }
              zIndex={poi === hover ? 110 : 99}
              onMouseOver={() => setHover(poi)}
              onMouseOut={() => setHover(null)}
            />
          ))}

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

        <IntersectionAddressFunc
          intersectionAddress={intersectionAddress}
          hover={hover}
          setHover={setHover}
          setPath={setPath}
        />
      </Amap>
      <Modal
        visible={isShowFinal}
        destroyOnClose={true}
        title={<div>路径规划</div>}
        onCancel={() => {
          setIsShowFinal(false);
        }}
        footer={[
          <Button
            type="primary"
            onClick={() => {
              setIsShowFinal(false);
            }}
          >
            关闭
          </Button>,
        ]}
      >
        <div>
          目的地：<span style={{ fontWeight: 'bold' }}>{currentSelectAddress}</span>
          <CopyToClipboard text={currentSelectAddress} onCopy={copySuccessNotification}>
            <CopyOutlined style={{ marginLeft: '8px', color: 'rgba(0,0,0,0.4)' }} />
          </CopyToClipboard>
        </div>
        <div>
          当前公交换乘策略：<span style={{ fontWeight: 'bold' }}>{policyTitle}</span>
        </div>

        {currentRoutePlan.length > 0 && (
          <List
            itemLayout="horizontal"
            dataSource={currentRoutePlan}
            renderItem={(routePlan) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <div className="quick-meet__route-plan-start">
                      起点：{routePlan.start.name}{' '}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          ac.transferOnAMAP({
                            origin: routePlan.result.origin,
                            originName: routePlan.start.name,
                            destination: routePlan.result.destination,
                            destinationName: routePlan.end.name,
                          });
                        }}
                        style={{ marginLeft: '10px', color: '#108ee9', fontWeight: '400', cursor: 'pointer' }}
                      >
                        点击唤起高德地图客户端
                      </span>
                    </div>
                  }
                  description={
                    <div className="quick-meet__route-plan-result">
                      {routePlan.result && routePlan.result.plans && routePlan.result.plans[0] && (
                        <div className="quick-meet__route-plan-taxi-cost">
                          公交花费大约：
                          <span style={{ fontWeight: 'bold' }}>
                            ￥{routePlan.result.plans[0].cost}, {secondToDate(routePlan.result.plans[0].time)}
                          </span>
                        </div>
                      )}
                      {routePlan.result && routePlan.result.taxi_cost && (
                        <div className="quick-meet__route-plan-taxi-cost">
                          打车花费大约：<span style={{ fontWeight: 'bold' }}>￥{routePlan.result.taxi_cost}</span>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
}
