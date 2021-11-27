import React from 'react';
import { Cascader } from 'antd';
import { usePromise, loadCities } from '../utils/common';

export default function SelectCity(props) {
  const [cities] = usePromise(loadCities(), []);

  return (
    <Cascader
      options={cities}
      value={props.city}
      onChange={(values) => {
        props.onCityChange && props.onCityChange(values);
      }}
      allowClear={false}
      placeholder="选择城市"
      style={{ width: 100 }}
      displayRender={(labels) => (labels.length > 0 ? labels[labels.length - 1] : '')}
    />
  );
}
