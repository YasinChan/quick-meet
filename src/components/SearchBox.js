import React, { useMemo, useState } from 'react';
import { Input, AutoComplete } from 'antd';
import { usePlugins } from '@amap/amap-react';
import { noop } from '../utils/common';

export default function SearchBox(props) {
  const AMap = usePlugins(['AMap.AutoComplete', 'AMap.DistrictSearch']);
  const [options, setOptions] = useState([]);
  const ac = useMemo(() => {
    if (AMap) return new AMap.AutoComplete();
    else return null;
  }, [AMap]);

  const handleSearch = (kw) => {
    if (!ac) return;
    if (!kw) {
      setOptions([]);
      return;
    }
    ac.setCity(props.city);
    ac.search(kw, (status, result) => {
      if (status === 'complete' && result.tips) {
        const uniq = new Set(result.tips.map((tip) => tip.name));
        setOptions(Array.from(uniq));
      } else {
        setOptions([]);
      }
    });
  };

  const onSelect = (value, a) => {
    const { onSearch = noop } = props;
    onSearch(value);
  };

  return (
    <div className="quick-meet__search-box">
      <Input.Group compact>
        <AutoComplete
          style={{ width: '100%' }}
          defaultValue={props.query}
          options={options.map((value) => ({
            value,
            label: <div>{value}</div>,
          }))}
          onSelect={onSelect}
          onSearch={handleSearch}
        >
          <Input placeholder="输入地址" allowClear onPressEnter={onSelect} />
        </AutoComplete>
      </Input.Group>
    </div>
  );
}
