import React, { PropsWithChildren } from 'react';
import './Content.scss';

const Content: React.FC<PropsWithChildren> = (props) => {
  const { children } = props;

  return <div className="fixed-width-wrap">{children}</div>;
};

export default Content;
