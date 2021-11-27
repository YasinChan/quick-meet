import React, { useEffect, useState } from 'react';
import { Card, List, Button, Pagination } from 'antd';
import { noop } from '../utils/common';

export default function SearchResult(props) {
  const { ps } = props;
  const pageSize = 20;
  const [status, setStatus] = useState('idle');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    setPage(1);
    setTotal(0);
    setResults([]);
    if (ps && props.city) {
      ps.setCity(props.city);
    }
  }, [ps, props.query, props.city]);

  useEffect(() => {
    if (!ps) return;
    setStatus('searching');
    ps.setPageSize(pageSize);
    ps.setPageIndex(page);
    ps.search(props.query, (status, result) => {
      const { onResult = noop } = props;
      if (status === 'complete' && result.poiList) {
        setStatus('success');
        setResults(result.poiList.pois);
        setTotal(result.poiList.count);
        onResult(result.poiList.pois);
      } else {
        setStatus('failed');
        setResults([]);
        setTotal(0);
        onResult([]);
      }
    });
  }, [ps, props.query, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPagination = () => {
    if (total <= 0) return null;
    return (
      <Pagination simple size="small" current={page} pageSize={pageSize} total={total} onChange={(p) => setPage(p)} />
    );
  };

  return (
    <Card
      className="search-result"
      title={`共约 ${total} 条结果`}
      extra={
        <Button className="cancel-button" type="link" onClick={props.onClose}>
          返回
        </Button>
      }
      headStyle={{
        padding: '0 12px',
      }}
      bodyStyle={{
        maxHeight: '450px',
        overflowY: 'scroll',
        padding: '0 12px 24px',
      }}
    >
      <List
        dataSource={results}
        loading={status === 'searching'}
        renderItem={(poi) => (
          <List.Item onClick={() => props.onSelect && props.onSelect(poi)} style={{ cursor: 'pointer' }}>
            <List.Item.Meta title={poi.name} description={poi.address} />
          </List.Item>
        )}
        header={renderPagination()}
        footer={renderPagination()}
      />
    </Card>
  );
}
