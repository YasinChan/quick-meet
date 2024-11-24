# quick meet

> 一个可以快速找到聚会地点的[网站](https://qm.yasinchan.com/)。

## 小程序版本「快见」已发布，欢迎扫码体验！

![pic](https://file.yasinchan.com/y5lADKfOvXQD909wMUojrqPXPS8slvCh/%E4%B8%8B%E8%BD%BD.png)

## 灵感来源

某次，一位朋友约我和另一位陪他去 4s 店看车，我们都在上海工作，不过大家居住地相距甚远。当时为了找到对大家通勤都比较合适的 4s 店，我通过地图软件搜索了上海的所有该品牌车的 4s 店地址，再对比各自位置，通过目测，大体过滤出几个店，再通过地图路线规划得出的乘坐公共交通工具的时间，最后将多个店的地址和时间都列出来跟伙伴们一起讨论才得出目的地，这个过程比较繁琐，所以想到做这个工具。

## 产品逻辑

1. 输入多人当前地址，与目标场景如“海底捞”、“万达”，点击搜索后在地图上展示所有合适的目标地点。
2. 合适的目标地点是指多个当前地址根据彼此之间距离的最大值搜索周围目标点，得到交集处的地址在地图上展示出来。可以根据实际情况手动调节倍数，扩大搜索范围，倍数范围为 [1, 2]。
3. 可以通过开关在地图上展示出半径内所有的目标地点。
4. 点击地图上显示出来的标记点，会显示路径规划，可以选择公交换乘策略，也可以唤出高德地图客户端。

## 技术方案

基于 [AMap-React](https://jimnox.gitee.io/amap-react/) ，一款由 [AMap](https://amap.com/) 官方集成了[高德地图 API](https://lbs.amap.com/api/jsapi-v2/summary/) 与 React 的地图框架，配合 UI 库 [ant design](https://ant.design/index-cn)，完成了以上构想。

## 开发方式

拉取代码后，请查看 .env.example 文件，需要从高德地图控制台免费[创建新的 key ](https://console.amap.com/dev/key/app)，本地创建 .env 文件按 example 配置两个字段，另外还需要配置 nginx 转发规则，细节请查看[官方文档](https://lbs.amap.com/api/jsapi-v2/guide/abc/prepare)。

欢迎 PR 和提 issues~

[MIT License](https://opensource.org/licenses/MIT)
