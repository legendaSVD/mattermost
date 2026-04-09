import {EMOJI_PATTERN} from 'utils/emoticons';
import PlainRenderer from './plain_renderer';
export default class MentionableRenderer extends PlainRenderer {
    public text(text: string) {
        return text.replace(EMOJI_PATTERN, '');
    }
}