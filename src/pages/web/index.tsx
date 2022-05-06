import { h } from 'preact';
import { ParsePage } from '../../components';
import { base64ToBinary } from '../../utils';

const download = (data: BlobPart) => {
  const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
  const $a = document.createElement('a');
  $a.setAttribute('download', 'apng.png');
  $a.setAttribute('href', url);
  $a.click();
};

const ApngParsePage = () => (
  <ParsePage
    exportApng={async (apng) => download(apng.data)}
    exportPng={async (apng, idx) => download(base64ToBinary(apng.frameImages[idx]))}
  />
);

export { ApngParsePage };
