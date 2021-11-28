import React, { useState } from 'react';
import { Card, Tooltip, Button, Modal, List } from 'antd';
import SearchBox from './SearchBox';
import SearchResult from './SearchResult';
import SelectCity from './SelectCity';
import { PlusOutlined } from '@ant-design/icons';

export default function SelectCurrentPlace(props) {
  const { $map, ps, setHover, address, setAddress, city, setCity, setIntersectionAddress } = props;

  const [mode, setMode] = useState('input');
  const [query, setQuery] = useState('');
  const [searchBoxVisible, setSearchBoxVisible] = useState(false);

  const clearSearch = () => {
    setHover(null);
  };

  const handleSearch = (query) => {
    setQuery(query);
  };

  return (
    <>
      <SelectCity
        city={city}
        onCityChange={(values) => {
          setAddress([]);
          setCity(values);
          setIntersectionAddress([]);
          $map.current.setCity(values[values.length - 1]);
          setSearchBoxVisible(true);
        }}
      />
      {address.length > 0 && (
        <List
          dataSource={address}
          locale={''}
          renderItem={(poi) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              actions={[
                <a
                  onClick={() => {
                    const addressFilter = address.filter((ad) => ad.id !== poi.id);
                    setAddress(addressFilter);
                  }}
                >
                  删除
                </a>,
              ]}
            >
              <List.Item.Meta title={poi.name} description={poi.address} />
            </List.Item>
          )}
        />
      )}
      {city.length > 0 && (
        <Tooltip title="新增地址">
          <Button
            className="quick-meet__add-address"
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={() => {
              setIntersectionAddress([]);
              setSearchBoxVisible(true);
            }}
          />
        </Tooltip>
      )}
      <Modal
        visible={searchBoxVisible}
        destroyOnClose={true}
        title="选择地址"
        onCancel={() => {
          setSearchBoxVisible(false);
        }}
        footer={[
          <Button
            type="primary"
            onClick={() => {
              setSearchBoxVisible(false);
            }}
          >
            关闭
          </Button>,
        ]}
      >
        {mode === 'input' && (
          <SearchBox
            query={query}
            onSearch={(query) => {
              clearSearch();
              handleSearch(query);
              setMode('result');
            }}
            city={city}
          />
        )}
        {mode === 'result' && (
          <SearchResult
            city={city[city.length - 1]}
            ps={ps}
            query={query}
            onClose={() => {
              clearSearch();
              setMode('input');
            }}
            onSelect={(poi) => {
              setHover(poi);
              setAddress((oldVal) => [...oldVal, poi]);
              setSearchBoxVisible(false);
              if ($map.current) {
                $map.current.setZoomAndCenter(17, [poi.location.lng, poi.location.lat], true);
              }
              clearSearch();
              setMode('input');
            }}
          />
        )}
      </Modal>
    </>
  );
}
