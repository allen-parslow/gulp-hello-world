import _ from 'lodash';
import greeter from './greeter';

const app = document.getElementById('app');
app.innerText = greeter(_.capitalize('dave'));
