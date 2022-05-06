import { h, render } from 'preact';
import { ApngParsePage as APP } from './pages/app';
import { ApngParsePage as WEB } from './pages/web';

render(import.meta.env.VITE_ENV === 'app' ? <APP /> : <WEB />, document.getElementById('app')!);
