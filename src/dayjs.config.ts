import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/ru';

// Extend dayjs with UTC plugin
dayjs.extend(utc);

// Set default locale to Russian
dayjs.locale('ru');

export default dayjs;
