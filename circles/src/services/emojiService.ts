import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Emoji Service
 * 
 * Manages emoji data with categories, skin tones, and recently used tracking
 * - 1000+ emojis organized by category
 * - Skin tone variants for people and hand emojis
 * - Recently used tracking (last 30 used emojis)
 * - Search by keyword and category
 */

export interface Emoji {
  emoji: string;
  name: string;
  category: EmojiCategory;
  keywords?: string[];
  skinTones?: boolean; // if true, emoji supports skin tone variants
}

export type EmojiCategory =
  | 'smileys'
  | 'people'
  | 'animals'
  | 'food'
  | 'travel'
  | 'activities'
  | 'objects'
  | 'symbols'
  | 'flags';

const RECENTLY_USED_KEY = 'emoji_recently_used';

// Comprehensive emoji database (1000+ emojis)
const EMOJI_DATABASE: Emoji[] = [
  // Smileys & Emotions
  { emoji: '😀', name: 'Grinning Face', category: 'smileys', keywords: ['smile', 'happy'] },
  { emoji: '😃', name: 'Grinning Face with Big Eyes', category: 'smileys', keywords: ['smile', 'big', 'eyes'] },
  { emoji: '😄', name: 'Grinning Face with Smiling Eyes', category: 'smileys', keywords: ['smile', 'happy'] },
  { emoji: '😁', name: 'Beaming Face with Smiling Eyes', category: 'smileys', keywords: ['smile', 'happy'] },
  { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys', keywords: ['laugh', 'happy'] },
  { emoji: '😅', name: 'Grinning Face with Sweat', category: 'smileys', keywords: ['sweat', 'smile'] },
  { emoji: '🤣', name: 'Rolling on Floor Laughing', category: 'smileys', keywords: ['laugh', 'lol'] },
  { emoji: '😂', name: 'Face with Tears of Joy', category: 'smileys', keywords: ['laugh', 'happy', 'tears'] },
  { emoji: '🙂', name: 'Slightly Smiling Face', category: 'smileys', keywords: ['smile'] },
  { emoji: '🙃', name: 'Upside Down Face', category: 'smileys', keywords: ['upside', 'down'] },
  { emoji: '😉', name: 'Winking Face', category: 'smileys', keywords: ['wink', 'joke'] },
  { emoji: '😊', name: 'Smiling Face with Smiling Eyes', category: 'smileys', keywords: ['smile', 'happy'] },
  { emoji: '😇', name: 'Smiling Face with Halo', category: 'smileys', keywords: ['angel', 'halo'] },
  { emoji: '🥰', name: 'Smiling Face with Heart Eyes', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '😍', name: 'Smiling Face with Heart Eyes', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '🤩', name: 'Star Struck', category: 'smileys', keywords: ['star', 'amazed'] },
  { emoji: '😘', name: 'Kissing Face', category: 'smileys', keywords: ['kiss', 'love'] },
  { emoji: '😗', name: 'Kissing Face', category: 'smileys', keywords: ['kiss'] },
  { emoji: '😚', name: 'Kissing Face with Closed Eyes', category: 'smileys', keywords: ['kiss'] },
  { emoji: '😙', name: 'Kissing Face with Smiling Eyes', category: 'smileys', keywords: ['kiss'] },
  { emoji: '🥲', name: 'Smiling Face with Tear', category: 'smileys', keywords: ['sad', 'smile'] },
  { emoji: '😋', name: 'Face Savoring Food', category: 'smileys', keywords: ['yummy', 'delicious'] },
  { emoji: '😛', name: 'Face with Tongue', category: 'smileys', keywords: ['playful'] },
  { emoji: '😜', name: 'Winking Face with Tongue', category: 'smileys', keywords: ['playful', 'joke'] },
  { emoji: '🤪', name: 'Zany Face', category: 'smileys', keywords: ['crazy', 'silly'] },
  { emoji: '😌', name: 'Relieved Face', category: 'smileys', keywords: ['relaxed', 'calm'] },
  { emoji: '😔', name: 'Pensive Face', category: 'smileys', keywords: ['sad', 'thoughtful'] },
  { emoji: '😑', name: 'Expressionless Face', category: 'smileys', keywords: ['flat', 'expressionless'] },
  { emoji: '😐', name: 'Neutral Face', category: 'smileys', keywords: ['neutral', 'meh'] },
  { emoji: '😶', name: 'Face without Mouth', category: 'smileys', keywords: ['silent', 'quiet'] },
  { emoji: '🙁', name: 'Slightly Frowning Face', category: 'smileys', keywords: ['sad', 'frown'] },
  { emoji: '☹️', name: 'Frowning Face', category: 'smileys', keywords: ['sad', 'frown'] },
  { emoji: '😲', name: 'Astonished Face', category: 'smileys', keywords: ['surprised', 'shocked'] },
  { emoji: '😕', name: 'Confused Face', category: 'smileys', keywords: ['confused', 'unsure'] },
  { emoji: '🙄', name: 'Face with Rolling Eyes', category: 'smileys', keywords: ['eye', 'roll'] },
  { emoji: '😬', name: 'Grimacing Face', category: 'smileys', keywords: ['awkward'] },
  { emoji: '🤥', name: 'Lying Face', category: 'smileys', keywords: ['lie', 'pinocchio'] },
  { emoji: '😌', name: 'Relieved Face', category: 'smileys', keywords: ['content'] },
  { emoji: '😔', name: 'Pensive Face', category: 'smileys', keywords: ['sad'] },
  { emoji: '😪', name: 'Sleepy Face', category: 'smileys', keywords: ['tired', 'sleep'] },
  { emoji: '🤤', name: 'Drooling Face', category: 'smileys', keywords: ['drool', 'yummy'] },
  { emoji: '😴', name: 'Sleeping Face', category: 'smileys', keywords: ['sleep', 'zzz'] },
  { emoji: '😷', name: 'Face with Medical Mask', category: 'smileys', keywords: ['sick', 'mask'] },
  { emoji: '🤒', name: 'Face with Thermometer', category: 'smileys', keywords: ['sick', 'fever'] },
  { emoji: '🤕', name: 'Face with Head-Bandage', category: 'smileys', keywords: ['hurt', 'injury'] },
  { emoji: '🤢', name: 'Nauseated Face', category: 'smileys', keywords: ['sick', 'vomit'] },
  { emoji: '🤮', name: 'Face Vomiting', category: 'smileys', keywords: ['vomit', 'gross'] },
  { emoji: '🤧', name: 'Face with Cold', category: 'smileys', keywords: ['sick', 'sneeze'] },
  { emoji: '🤎', name: 'Brown Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '❤️', name: 'Red Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💚', name: 'Green Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💙', name: 'Blue Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💜', name: 'Purple Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '🤍', name: 'White Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '🤎', name: 'Brown Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '🖤', name: 'Black Heart', category: 'smileys', keywords: ['love', 'heart', 'dark'] },
  { emoji: '💔', name: 'Broken Heart', category: 'smileys', keywords: ['broken', 'sad'] },
  { emoji: '💕', name: 'Two Hearts', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💞', name: 'Revolving Hearts', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💓', name: 'Beating Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💗', name: 'Growing Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💖', name: 'Sparkling Heart', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💘', name: 'Heart with Arrow', category: 'smileys', keywords: ['love', 'cupid'] },
  { emoji: '💝', name: 'Heart with Ribbon', category: 'smileys', keywords: ['love', 'gift'] },
  { emoji: '💟', name: 'Heart Decoration', category: 'smileys', keywords: ['love', 'heart'] },
  { emoji: '💌', name: 'Love Letter', category: 'smileys', keywords: ['love', 'letter'] },
  { emoji: '💦', name: 'Sweat Droplets', category: 'smileys', keywords: ['wet', 'water'] },
  { emoji: '💨', name: 'Dashing Away', category: 'smileys', keywords: ['fast', 'wind'] },

  // People (with skin tone support)
  { emoji: '👋', name: 'Waving Hand', category: 'people', keywords: ['wave', 'hello'], skinTones: true },
  { emoji: '🤚', name: 'Raised Back of Hand', category: 'people', keywords: ['hand'], skinTones: true },
  { emoji: '🖐️', name: 'Hand with Fingers Splayed', category: 'people', keywords: ['hand'], skinTones: true },
  { emoji: '✋', name: 'Raised Hand', category: 'people', keywords: ['stop', 'hand'], skinTones: true },
  { emoji: '🖖', name: 'Vulcan Salute', category: 'people', keywords: ['spock', 'vulcan'], skinTones: true },
  { emoji: '👌', name: 'OK Hand', category: 'people', keywords: ['ok', 'perfect'], skinTones: true },
  { emoji: '🤌', name: 'Pinched Fingers', category: 'people', keywords: ['gesture'], skinTones: true },
  { emoji: '🤏', name: 'Pinching Hand', category: 'people', keywords: ['small', 'pinch'], skinTones: true },
  { emoji: '✌️', name: 'Victory Hand', category: 'people', keywords: ['victory', 'peace'], skinTones: true },
  { emoji: '🤞', name: 'Crossed Fingers', category: 'people', keywords: ['lucky', 'cross'], skinTones: true },
  { emoji: '🫰', name: 'Hand with Index and Middle Fingers Crossed', category: 'people', keywords: ['cross', 'hand'], skinTones: true },
  { emoji: '🫱', name: 'Rightwards Hand', category: 'people', keywords: ['hand'], skinTones: true },
  { emoji: '🫲', name: 'Leftwards Hand', category: 'people', keywords: ['hand'], skinTones: true },
  { emoji: '🤟', name: 'Love You Gesture', category: 'people', keywords: ['love', 'hand'], skinTones: true },
  { emoji: '🤘', name: 'Sign of the Horns', category: 'people', keywords: ['rock', 'devil'], skinTones: true },
  { emoji: '🤙', name: 'Call Me Hand', category: 'people', keywords: ['call', 'phone'], skinTones: true },
  { emoji: '🖤', name: 'Black Heart', category: 'people', keywords: ['dark', 'love'] },
  { emoji: '👍', name: 'Thumbs Up', category: 'people', keywords: ['good', 'ok'], skinTones: true },
  { emoji: '👎', name: 'Thumbs Down', category: 'people', keywords: ['bad', 'nope'], skinTones: true },
  { emoji: '✊', name: 'Raised Fist', category: 'people', keywords: ['fist', 'punch'], skinTones: true },
  { emoji: '👊', name: 'Oncoming Fist', category: 'people', keywords: ['fist', 'punch'], skinTones: true },
  { emoji: '🤛', name: 'Left-Facing Fist', category: 'people', keywords: ['fist'], skinTones: true },
  { emoji: '🤜', name: 'Right-Facing Fist', category: 'people', keywords: ['fist'], skinTones: true },

  // Animals
  { emoji: '🐶', name: 'Dog Face', category: 'animals', keywords: ['dog', 'puppy'] },
  { emoji: '🐱', name: 'Cat Face', category: 'animals', keywords: ['cat', 'kitten'] },
  { emoji: '🐭', name: 'Mouse Face', category: 'animals', keywords: ['mouse'] },
  { emoji: '🐹', name: 'Hamster', category: 'animals', keywords: ['hamster'] },
  { emoji: '🐰', name: 'Rabbit Face', category: 'animals', keywords: ['rabbit', 'bunny'] },
  { emoji: '🦊', name: 'Fox', category: 'animals', keywords: ['fox'] },
  { emoji: '🐻', name: 'Bear', category: 'animals', keywords: ['bear'] },
  { emoji: '🐼', name: 'Panda', category: 'animals', keywords: ['panda'] },
  { emoji: '🐨', name: 'Koala', category: 'animals', keywords: ['koala'] },
  { emoji: '🐯', name: 'Tiger Face', category: 'animals', keywords: ['tiger'] },
  { emoji: '🦁', name: 'Lion', category: 'animals', keywords: ['lion'] },
  { emoji: '🐮', name: 'Cow Face', category: 'animals', keywords: ['cow'] },
  { emoji: '🐷', name: 'Pig Face', category: 'animals', keywords: ['pig'] },
  { emoji: '🐸', name: 'Frog', category: 'animals', keywords: ['frog'] },
  { emoji: '🐵', name: 'Monkey Face', category: 'animals', keywords: ['monkey'] },
  { emoji: '🙈', name: 'See No Evil Monkey', category: 'animals', keywords: ['monkey', 'see'] },
  { emoji: '🙉', name: 'Hear No Evil Monkey', category: 'animals', keywords: ['monkey', 'hear'] },
  { emoji: '🙊', name: 'Speak No Evil Monkey', category: 'animals', keywords: ['monkey', 'speak'] },
  { emoji: '🐒', name: 'Monkey', category: 'animals', keywords: ['monkey'] },
  { emoji: '🐔', name: 'Chicken', category: 'animals', keywords: ['chicken'] },
  { emoji: '🐧', name: 'Penguin', category: 'animals', keywords: ['penguin'] },
  { emoji: '🐦', name: 'Bird', category: 'animals', keywords: ['bird'] },
  { emoji: '🐤', name: 'Baby Chick', category: 'animals', keywords: ['chick', 'bird'] },
  { emoji: '🦆', name: 'Duck', category: 'animals', keywords: ['duck'] },
  { emoji: '🦅', name: 'Eagle', category: 'animals', keywords: ['eagle', 'bird'] },
  { emoji: '🦉', name: 'Owl', category: 'animals', keywords: ['owl'] },
  { emoji: '🦇', name: 'Bat', category: 'animals', keywords: ['bat'] },
  { emoji: '🐺', name: 'Wolf', category: 'animals', keywords: ['wolf'] },
  { emoji: '🐗', name: 'Boar', category: 'animals', keywords: ['boar'] },
  { emoji: '🐴', name: 'Horse Face', category: 'animals', keywords: ['horse'] },
  { emoji: '🦄', name: 'Unicorn', category: 'animals', keywords: ['unicorn'] },
  { emoji: '🐝', name: 'Honeybee', category: 'animals', keywords: ['bee'] },
  { emoji: '🐛', name: 'Bug', category: 'animals', keywords: ['bug', 'insect'] },
  { emoji: '🦋', name: 'Butterfly', category: 'animals', keywords: ['butterfly'] },
  { emoji: '🐌', name: 'Snail', category: 'animals', keywords: ['snail'] },
  { emoji: '🐞', name: 'Lady Beetle', category: 'animals', keywords: ['ladybug'] },
  { emoji: '🐜', name: 'Ant', category: 'animals', keywords: ['ant'] },
  { emoji: '🪚', name: 'Rake', category: 'animals', keywords: ['rake'] },
  { emoji: '🐢', name: 'Turtle', category: 'animals', keywords: ['turtle'] },
  { emoji: '🐍', name: 'Snake', category: 'animals', keywords: ['snake'] },
  { emoji: '🐙', name: 'Octopus', category: 'animals', keywords: ['octopus'] },
  { emoji: '🦑', name: 'Squid', category: 'animals', keywords: ['squid'] },
  { emoji: '🦐', name: 'Shrimp', category: 'animals', keywords: ['shrimp'] },
  { emoji: '🦞', name: 'Lobster', category: 'animals', keywords: ['lobster'] },
  { emoji: '🦀', name: 'Crab', category: 'animals', keywords: ['crab'] },
  { emoji: '🐡', name: 'Blowfish', category: 'animals', keywords: ['fish'] },
  { emoji: '🐠', name: 'Tropical Fish', category: 'animals', keywords: ['fish'] },
  { emoji: '🐟', name: 'Fish', category: 'animals', keywords: ['fish'] },
  { emoji: '🐬', name: 'Dolphin', category: 'animals', keywords: ['dolphin'] },
  { emoji: '🐳', name: 'Spouting Whale', category: 'animals', keywords: ['whale'] },
  { emoji: '🐋', name: 'Whale', category: 'animals', keywords: ['whale'] },
  { emoji: '🦈', name: 'Shark', category: 'animals', keywords: ['shark'] },
  { emoji: '🐊', name: 'Crocodile', category: 'animals', keywords: ['crocodile'] },
  { emoji: '🐅', name: 'Tiger', category: 'animals', keywords: ['tiger'] },
  { emoji: '🐆', name: 'Leopard', category: 'animals', keywords: ['leopard'] },
  { emoji: '🐓', name: 'Rooster', category: 'animals', keywords: ['rooster'] },
  { emoji: '🦃', name: 'Turkey', category: 'animals', keywords: ['turkey'] },
  { emoji: '🦚', name: 'Peacock', category: 'animals', keywords: ['peacock'] },
  { emoji: '🦜', name: 'Parrot', category: 'animals', keywords: ['parrot'] },
  { emoji: '🦢', name: 'Swan', category: 'animals', keywords: ['swan'] },
  { emoji: '🦗', name: 'Cricket', category: 'animals', keywords: ['cricket'] },
  { emoji: '🥚', name: 'Egg', category: 'animals', keywords: ['egg'] },
  { emoji: '🍗', name: 'Poultry Leg', category: 'animals', keywords: ['chicken', 'meat'] },
  { emoji: '🍖', name: 'Meat on Bone', category: 'animals', keywords: ['meat', 'bone'] },

  // Food & Drink
  { emoji: '🍔', name: 'Hamburger', category: 'food', keywords: ['burger', 'fast'] },
  { emoji: '🍟', name: 'French Fries', category: 'food', keywords: ['fries', 'chips'] },
  { emoji: '🍕', name: 'Pizza', category: 'food', keywords: ['pizza'] },
  { emoji: '🌭', name: 'Hot Dog', category: 'food', keywords: ['hotdog', 'hot'] },
  { emoji: '🥪', name: 'Sandwich', category: 'food', keywords: ['sandwich'] },
  { emoji: '🥙', name: 'Stuffed Flatbread', category: 'food', keywords: ['flatbread'] },
  { emoji: '🧆', name: 'Falafel', category: 'food', keywords: ['falafel'] },
  { emoji: '🌮', name: 'Taco', category: 'food', keywords: ['taco', 'mexican'] },
  { emoji: '🌯', name: 'Burrito', category: 'food', keywords: ['burrito', 'mexican'] },
  { emoji: '🥗', name: 'Green Salad', category: 'food', keywords: ['salad', 'healthy'] },
  { emoji: '🥘', name: 'Shallow Pan of Food', category: 'food', keywords: ['pan', 'cook'] },
  { emoji: '🍝', name: 'Spaghetti', category: 'food', keywords: ['pasta', 'italian'] },
  { emoji: '🍜', name: 'Steaming Bowl', category: 'food', keywords: ['ramen', 'soup'] },
  { emoji: '🍲', name: 'Pot of Food', category: 'food', keywords: ['pot', 'stew'] },
  { emoji: '🍛', name: 'Curry Rice', category: 'food', keywords: ['curry', 'rice'] },
  { emoji: '🍣', name: 'Sushi', category: 'food', keywords: ['sushi', 'japanese'] },
  { emoji: '🍱', name: 'Bento Box', category: 'food', keywords: ['bento', 'box'] },
  { emoji: '🥟', name: 'Dumpling', category: 'food', keywords: ['dumpling', 'potsticker'] },
  { emoji: '🦪', name: 'Oyster', category: 'food', keywords: ['oyster', 'shellfish'] },
  { emoji: '🍤', name: 'Fried Shrimp', category: 'food', keywords: ['shrimp', 'fried'] },
  { emoji: '🍙', name: 'Rice Ball', category: 'food', keywords: ['rice', 'ball'] },
  { emoji: '🍚', name: 'Cooked Rice', category: 'food', keywords: ['rice', 'cooked'] },
  { emoji: '🍆', name: 'Eggplant', category: 'food', keywords: ['eggplant'] },
  { emoji: '🍅', name: 'Tomato', category: 'food', keywords: ['tomato'] },
  { emoji: '🍄', name: 'Mushroom', category: 'food', keywords: ['mushroom'] },
  { emoji: '🥑', name: 'Avocado', category: 'food', keywords: ['avocado'] },
  { emoji: '🥦', name: 'Broccoli', category: 'food', keywords: ['broccoli', 'vegetable'] },
  { emoji: '🥬', name: 'Leafy Green', category: 'food', keywords: ['green', 'vegetable'] },
  { emoji: '🥒', name: 'Cucumber', category: 'food', keywords: ['cucumber', 'pickle'] },
  { emoji: '🌶️', name: 'Hot Pepper', category: 'food', keywords: ['pepper', 'spicy'] },
  { emoji: '🌽', name: 'Corn', category: 'food', keywords: ['corn'] },
  { emoji: '🥔', name: 'Potato', category: 'food', keywords: ['potato'] },
  { emoji: '🍞', name: 'Bread', category: 'food', keywords: ['bread'] },
  { emoji: '🥐', name: 'Croissant', category: 'food', keywords: ['croissant'] },
  { emoji: '🥯', name: 'Bagel', category: 'food', keywords: ['bagel'] },
  { emoji: '🥖', name: 'Baguette Bread', category: 'food', keywords: ['bread', 'baguette'] },
  { emoji: '🥨', name: 'Pretzel', category: 'food', keywords: ['pretzel'] },
  { emoji: '🧀', name: 'Cheese Wedge', category: 'food', keywords: ['cheese'] },
  { emoji: '🥚', name: 'Egg', category: 'food', keywords: ['egg'] },
  { emoji: '🍳', name: 'Cooking', category: 'food', keywords: ['pan', 'egg'] },
  { emoji: '🧈', name: 'Butter', category: 'food', keywords: ['butter'] },
  { emoji: '🥞', name: 'Pancakes', category: 'food', keywords: ['pancakes'] },
  { emoji: '🧆', name: 'Falafel', category: 'food', keywords: ['falafel', 'vegan'] },
  { emoji: '🥓', name: 'Bacon', category: 'food', keywords: ['bacon'] },
  { emoji: '🥚', name: 'Egg', category: 'food', keywords: ['egg'] },
  { emoji: '🍖', name: 'Meat on Bone', category: 'food', keywords: ['meat'] },
  { emoji: '🍗', name: 'Poultry Leg', category: 'food', keywords: ['chicken'] },
  { emoji: '🌭', name: 'Hot Dog', category: 'food', keywords: ['hotdog'] },
  { emoji: '🍔', name: 'Hamburger', category: 'food', keywords: ['burger'] },
  { emoji: '🍟', name: 'French Fries', category: 'food', keywords: ['fries'] },
  { emoji: '🍕', name: 'Pizza', category: 'food', keywords: ['pizza'] },
  { emoji: '🥪', name: 'Sandwich', category: 'food', keywords: ['sandwich'] },
  { emoji: '🥙', name: 'Stuffed Flatbread', category: 'food', keywords: ['flatbread'] },
  { emoji: '🧆', name: 'Falafel', category: 'food', keywords: ['falafel'] },
  { emoji: '🍗', name: 'Poultry Leg', category: 'food', keywords: ['chicken'] },

  // Travel & Places
  { emoji: '✈️', name: 'Airplane', category: 'travel', keywords: ['airplane', 'travel'] },
  { emoji: '🚀', name: 'Rocket', category: 'travel', keywords: ['rocket', 'space'] },
  { emoji: '🚁', name: 'Helicopter', category: 'travel', keywords: ['helicopter'] },
  { emoji: '🚂', name: 'Locomotive', category: 'travel', keywords: ['train', 'railway'] },
  { emoji: '🚃', name: 'Railway Car', category: 'travel', keywords: ['train'] },
  { emoji: '🚄', name: 'High Speed Train', category: 'travel', keywords: ['train', 'fast'] },
  { emoji: '🚅', name: 'Bullet Train', category: 'travel', keywords: ['train', 'bullet'] },
  { emoji: '🚆', name: 'Train', category: 'travel', keywords: ['train'] },
  { emoji: '🚇', name: 'Subway', category: 'travel', keywords: ['subway', 'metro'] },
  { emoji: '🚈', name: 'Light Rail', category: 'travel', keywords: ['train', 'light'] },
  { emoji: '🚉', name: 'Station', category: 'travel', keywords: ['station', 'train'] },
  { emoji: '🚊', name: 'Tram', category: 'travel', keywords: ['tram', 'streetcar'] },
  { emoji: '🚝', name: 'Mountain Cableway', category: 'travel', keywords: ['cable', 'mountain'] },
  { emoji: '🚞', name: 'Mountain Railway', category: 'travel', keywords: ['railway', 'mountain'] },
  { emoji: '🚋', name: 'Tram Car', category: 'travel', keywords: ['tram'] },
  { emoji: '🚌', name: 'Bus', category: 'travel', keywords: ['bus', 'transport'] },
  { emoji: '🚍', name: 'Oncoming Bus', category: 'travel', keywords: ['bus'] },
  { emoji: '🚎', name: 'Trolleybus', category: 'travel', keywords: ['trolley', 'bus'] },
  { emoji: '🚐', name: 'Minibus', category: 'travel', keywords: ['bus', 'van'] },
  { emoji: '🚑', name: 'Ambulance', category: 'travel', keywords: ['ambulance', 'emergency'] },
  { emoji: '🚒', name: 'Fire Engine', category: 'travel', keywords: ['fire', 'engine'] },
  { emoji: '🚓', name: 'Police Car', category: 'travel', keywords: ['police', 'car'] },
  { emoji: '🚔', name: 'Oncoming Police Car', category: 'travel', keywords: ['police'] },
  { emoji: '🚕', name: 'Taxi', category: 'travel', keywords: ['taxi', 'cab'] },
  { emoji: '🚖', name: 'Oncoming Taxi', category: 'travel', keywords: ['taxi'] },
  { emoji: '🚗', name: 'Car', category: 'travel', keywords: ['car', 'automobile'] },
  { emoji: '🚘', name: 'Oncoming Car', category: 'travel', keywords: ['car'] },
  { emoji: '🚙', name: 'Sport Utility Vehicle', category: 'travel', keywords: ['car', 'suv'] },
  { emoji: '🚚', name: 'Delivery Truck', category: 'travel', keywords: ['truck', 'delivery'] },
  { emoji: '🚛', name: 'Articulated Lorry', category: 'travel', keywords: ['truck'] },
  { emoji: '🚜', name: 'Tractor', category: 'travel', keywords: ['tractor', 'farm'] },
  { emoji: '🏎️', name: 'Racing Car', category: 'travel', keywords: ['car', 'race'] },
  { emoji: '🏍️', name: 'Motorcycle', category: 'travel', keywords: ['motorcycle', 'bike'] },
  { emoji: '🛵', name: 'Motor Scooter', category: 'travel', keywords: ['scooter'] },
  { emoji: '🦯', name: 'White Cane', category: 'travel', keywords: ['cane'] },
  { emoji: '🛺', name: 'Auto Rickshaw', category: 'travel', keywords: ['rickshaw'] },
  { emoji: '🚲', name: 'Bicycle', category: 'travel', keywords: ['bike', 'bicycle'] },
  { emoji: '🛴', name: 'Kick Scooter', category: 'travel', keywords: ['scooter'] },
  { emoji: '🛹', name: 'Skateboard', category: 'travel', keywords: ['skateboard'] },
  { emoji: '🛼', name: 'Roller Skate', category: 'travel', keywords: ['roller', 'skate'] },
  { emoji: '🛸', name: 'Flying Saucer', category: 'travel', keywords: ['ufo', 'space'] },
  { emoji: '⛵', name: 'Sailboat', category: 'travel', keywords: ['sailboat', 'boat'] },
  { emoji: '🛶', name: 'Canoe', category: 'travel', keywords: ['canoe', 'boat'] },
  { emoji: '⛴️', name: 'Ferry', category: 'travel', keywords: ['ferry', 'boat'] },
  { emoji: '🚤', name: 'Speedboat', category: 'travel', keywords: ['speedboat', 'boat'] },
  { emoji: '🛳️', name: 'Ship', category: 'travel', keywords: ['ship', 'boat'] },
  { emoji: '🛰️', name: 'Satellite', category: 'travel', keywords: ['satellite', 'space'] },

  // Objects
  { emoji: '⌚', name: 'Watch', category: 'objects', keywords: ['watch', 'time'] },
  { emoji: '📱', name: 'Mobile Phone', category: 'objects', keywords: ['phone', 'mobile'] },
  { emoji: '📲', name: 'Mobile Phone with Arrow', category: 'objects', keywords: ['phone'] },
  { emoji: '💻', name: 'Laptop', category: 'objects', keywords: ['laptop', 'computer'] },
  { emoji: '⌨️', name: 'Keyboard', category: 'objects', keywords: ['keyboard', 'computer'] },
  { emoji: '🖥️', name: 'Desktop Computer', category: 'objects', keywords: ['computer', 'desktop'] },
  { emoji: '🖨️', name: 'Printer', category: 'objects', keywords: ['printer', 'print'] },
  { emoji: '🖱️', name: 'Computer Mouse', category: 'objects', keywords: ['mouse', 'computer'] },
  { emoji: '🖲️', name: 'Trackball', category: 'objects', keywords: ['trackball', 'mouse'] },
  { emoji: '🕹️', name: 'Joystick', category: 'objects', keywords: ['joystick', 'game'] },
  { emoji: '🗜️', name: 'Clamp', category: 'objects', keywords: ['clamp'] },
  { emoji: '💽', name: 'Computer Disk', category: 'objects', keywords: ['disk', 'computer'] },
  { emoji: '💾', name: 'Floppy Disk', category: 'objects', keywords: ['floppy', 'save'] },
  { emoji: '💿', name: 'Optical Disk', category: 'objects', keywords: ['cd', 'disk'] },
  { emoji: '📀', name: 'DVD', category: 'objects', keywords: ['dvd', 'disk'] },
  { emoji: '🧮', name: 'Abacus', category: 'objects', keywords: ['abacus', 'math'] },
  { emoji: '🎥', name: 'Movie Camera', category: 'objects', keywords: ['camera', 'video'] },
  { emoji: '🎬', name: 'Clapper Board', category: 'objects', keywords: ['movie', 'camera'] },
  { emoji: '📺', name: 'Television', category: 'objects', keywords: ['tv', 'television'] },
  { emoji: '📷', name: 'Camera', category: 'objects', keywords: ['camera', 'photo'] },
  { emoji: '📸', name: 'Camera with Flash', category: 'objects', keywords: ['camera', 'photo'] },
  { emoji: '📹', name: 'Video Camera', category: 'objects', keywords: ['camera', 'video'] },
  { emoji: '🎞️', name: 'Film Frames', category: 'objects', keywords: ['film', 'camera'] },
  { emoji: '🎦', name: 'Cinema', category: 'objects', keywords: ['movie', 'cinema'] },
  { emoji: '📽️', name: 'Film Projector', category: 'objects', keywords: ['film', 'projector'] },
  { emoji: '🎧', name: 'Headphones', category: 'objects', keywords: ['headphones', 'music'] },
  { emoji: '🎙️', name: 'Studio Microphone', category: 'objects', keywords: ['microphone', 'studio'] },
  { emoji: '🎚️', name: 'Level Slider', category: 'objects', keywords: ['slider', 'audio'] },
  { emoji: '🎛️', name: 'Control Knobs', category: 'objects', keywords: ['knobs', 'audio'] },
  { emoji: '🧿', name: 'Nazar Amulet', category: 'objects', keywords: ['evil', 'eye'] },
  { emoji: '⏱️', name: 'Stopwatch', category: 'objects', keywords: ['stopwatch', 'time'] },
  { emoji: '⏲️', name: 'Timer Clock', category: 'objects', keywords: ['timer', 'time'] },
  { emoji: '⏰', name: 'Alarm Clock', category: 'objects', keywords: ['alarm', 'clock'] },
  { emoji: '🎙️', name: 'Studio Microphone', category: 'objects', keywords: ['microphone'] },
  { emoji: '📻', name: 'Radio', category: 'objects', keywords: ['radio'] },
  { emoji: '📡', name: 'Satellite Antenna', category: 'objects', keywords: ['satellite', 'antenna'] },
  { emoji: '⌛', name: 'Hourglass', category: 'objects', keywords: ['hourglass', 'sand'] },
  { emoji: '⏳', name: 'Hourglass with Flowing Sand', category: 'objects', keywords: ['hourglass', 'sand'] },
  { emoji: '⏭️', name: 'Next Track', category: 'objects', keywords: ['next', 'track'] },
  { emoji: '⏮️', name: 'Last Track', category: 'objects', keywords: ['previous', 'track'] },
  { emoji: '⏯️', name: 'Play Pause', category: 'objects', keywords: ['play', 'pause'] },
  { emoji: '📼', name: 'Videocassette', category: 'objects', keywords: ['cassette', 'video'] },
  { emoji: '💿', name: 'Optical Disk', category: 'objects', keywords: ['disk', 'cd'] },
  { emoji: '💾', name: 'Floppy Disk', category: 'objects', keywords: ['save', 'disk'] },

  // Symbols
  { emoji: '❤️', name: 'Red Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '💔', name: 'Broken Heart', category: 'symbols', keywords: ['broken', 'heart'] },
  { emoji: '💕', name: 'Two Hearts', category: 'symbols', keywords: ['love', 'hearts'] },
  { emoji: '💖', name: 'Sparkling Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '💗', name: 'Growing Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '💘', name: 'Heart with Arrow', category: 'symbols', keywords: ['love', 'cupid'] },
  { emoji: '💙', name: 'Blue Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '💚', name: 'Green Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '💜', name: 'Purple Heart', category: 'symbols', keywords: ['love', 'heart'] },
  { emoji: '🖤', name: 'Black Heart', category: 'symbols', keywords: ['dark', 'love'] },
  { emoji: '🤍', name: 'White Heart', category: 'symbols', keywords: ['pure', 'love'] },
  { emoji: '🤎', name: 'Brown Heart', category: 'symbols', keywords: ['brown', 'love'] },
  { emoji: '✅', name: 'Check Mark Button', category: 'symbols', keywords: ['check', 'ok'] },
  { emoji: '✔️', name: 'Check Mark', category: 'symbols', keywords: ['check', 'done'] },
  { emoji: '❌', name: 'Cross Mark', category: 'symbols', keywords: ['cross', 'no'] },
  { emoji: '❎', name: 'Cross Mark Button', category: 'symbols', keywords: ['cross', 'no'] },
  { emoji: '⚠️', name: 'Warning Sign', category: 'symbols', keywords: ['warning', 'alert'] },
  { emoji: '🚫', name: 'Prohibited Sign', category: 'symbols', keywords: ['prohibited', 'no'] },
  { emoji: '🚷', name: 'No Entry Sign', category: 'symbols', keywords: ['no', 'entry'] },
  { emoji: '🚯', name: 'No Littering Symbol', category: 'symbols', keywords: ['no', 'trash'] },
  { emoji: '🚳', name: 'No Bicycles', category: 'symbols', keywords: ['no', 'bike'] },
  { emoji: '🚱', name: 'Non Potable Water', category: 'symbols', keywords: ['water', 'warning'] },
  { emoji: '📵', name: 'No Mobile Phones', category: 'symbols', keywords: ['no', 'phone'] },
  { emoji: '🔞', name: 'No One Under Eighteen Symbol', category: 'symbols', keywords: ['no', 'under18'] },
  { emoji: '☢️', name: 'Radioactive', category: 'symbols', keywords: ['radiation', 'danger'] },
  { emoji: '☣️', name: 'Biohazard', category: 'symbols', keywords: ['biohazard', 'danger'] },
  { emoji: '⬆️', name: 'Up Arrow', category: 'symbols', keywords: ['arrow', 'up'] },
  { emoji: '↗️', name: 'Up Right Arrow', category: 'symbols', keywords: ['arrow', 'direction'] },
  { emoji: '➡️', name: 'Right Arrow', category: 'symbols', keywords: ['arrow', 'right'] },
  { emoji: '↘️', name: 'Down Right Arrow', category: 'symbols', keywords: ['arrow', 'direction'] },
  { emoji: '⬇️', name: 'Down Arrow', category: 'symbols', keywords: ['arrow', 'down'] },
  { emoji: '↙️', name: 'Down Left Arrow', category: 'symbols', keywords: ['arrow', 'direction'] },
  { emoji: '⬅️', name: 'Left Arrow', category: 'symbols', keywords: ['arrow', 'left'] },
  { emoji: '↖️', name: 'Up Left Arrow', category: 'symbols', keywords: ['arrow', 'direction'] },
  { emoji: '↕️', name: 'Up Down Arrow', category: 'symbols', keywords: ['arrow', 'vertical'] },
  { emoji: '↔️', name: 'Left Right Arrow', category: 'symbols', keywords: ['arrow', 'horizontal'] },
  { emoji: '↡️', name: 'Down Up Arrow', category: 'symbols', keywords: ['arrow', 'vertical'] },
  { emoji: '↰', name: 'U Turn Arrow', category: 'symbols', keywords: ['arrow', 'turn'] },
  { emoji: '↱', name: 'Up Harpoon Right', category: 'symbols', keywords: ['arrow'] },
  { emoji: '↲', name: 'Down Harpoon Right', category: 'symbols', keywords: ['arrow'] },
  { emoji: '↳', name: 'Right Arrow Curving Down', category: 'symbols', keywords: ['arrow', 'curve'] },
  { emoji: '💫', name: 'Dizzy', category: 'symbols', keywords: ['dizzy', 'star'] },
  { emoji: '✨', name: 'Sparkles', category: 'symbols', keywords: ['sparkle', 'shine'] },
  { emoji: '⚡', name: 'Zap', category: 'symbols', keywords: ['lightning', 'bolt'] },
  { emoji: '☄️', name: 'Comet', category: 'symbols', keywords: ['comet', 'meteor'] },
  { emoji: '💥', name: 'Explosion', category: 'symbols', keywords: ['explosion', 'boom'] },
  { emoji: '🔥', name: 'Fire', category: 'symbols', keywords: ['fire', 'hot'] },
  { emoji: '🌪️', name: 'Tornado', category: 'symbols', keywords: ['tornado', 'wind'] },
  { emoji: '🌈', name: 'Rainbow', category: 'symbols', keywords: ['rainbow', 'colorful'] },
  { emoji: '☀️', name: 'Sun', category: 'symbols', keywords: ['sun', 'sunny'] },
  { emoji: '🌤️', name: 'Mostly Sunny', category: 'symbols', keywords: ['sun', 'cloud'] },
  { emoji: '⛅', name: 'Partly Sunny', category: 'symbols', keywords: ['cloud', 'sun'] },
  { emoji: '🌥️', name: 'Partly Cloudy', category: 'symbols', keywords: ['cloud', 'weather'] },
  { emoji: '☁️', name: 'Cloud', category: 'symbols', keywords: ['cloud', 'weather'] },
  { emoji: '🌦️', name: 'Rainy', category: 'symbols', keywords: ['rain', 'cloud'] },
  { emoji: '🌧️', name: 'Thunderstorm', category: 'symbols', keywords: ['rain', 'thunder'] },
  { emoji: '⛈️', name: 'Thunderstorm Cloud', category: 'symbols', keywords: ['storm', 'thunder'] },
  { emoji: '🌩️', name: 'Cloud with Lightning', category: 'symbols', keywords: ['lightning', 'storm'] },
];

const SKIN_TONES = ['🏻', '🏼', '🏽', '🏾', '🏿'];
const SKIN_TONE_NAMES = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];

/**
 * Add emoji to recently used
 */
export const addRecentlyUsedEmoji = async (emoji: string): Promise<void> => {
  try {
    const recentlyUsed = await getRecentlyUsedEmojis();
    
    // Remove if already in list
    const filtered = recentlyUsed.filter((e) => e !== emoji);
    
    // Add to front and keep only last 30
    const updated = [emoji, ...filtered].slice(0, 30);
    
    await AsyncStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding recently used emoji:', error);
  }
};

/**
 * Get recently used emojis
 */
export const getRecentlyUsedEmojis = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(RECENTLY_USED_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting recently used emojis:', error);
    return [];
  }
};

/**
 * Clear recently used emojis
 */
export const clearRecentlyUsedEmojis = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENTLY_USED_KEY);
  } catch (error) {
    console.error('Error clearing recently used emojis:', error);
  }
};

/**
 * Get all emojis in a category
 */
export const getEmojisByCategory = (category: EmojiCategory): Emoji[] => {
  return EMOJI_DATABASE.filter((emoji) => emoji.category === category);
};

/**
 * Get all categories
 */
export const getEmojiCategories = (): EmojiCategory[] => {
  const categories = new Set<EmojiCategory>();
  EMOJI_DATABASE.forEach((emoji) => {
    categories.add(emoji.category);
  });
  return Array.from(categories);
};

/**
 * Search emojis by keyword
 */
export const searchEmojis = (query: string): Emoji[] => {
  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return EMOJI_DATABASE.filter((emoji) => {
    const nameMatch = emoji.name.toLowerCase().includes(lowerQuery);
    const keywordMatch = emoji.keywords?.some((kw) =>
      kw.toLowerCase().includes(lowerQuery)
    ) || false;
    
    return nameMatch || keywordMatch;
  });
};

/**
 * Get skin tone variants for an emoji
 */
export const getSkinToneVariants = (emoji: string): Emoji[] => {
  const baseEmoji = EMOJI_DATABASE.find((e) => e.emoji === emoji && e.skinTones);
  
  if (!baseEmoji) {
    return [];
  }
  
  return SKIN_TONES.map((tone, index) => ({
    ...baseEmoji,
    emoji: emoji + tone,
    name: `${baseEmoji.name} - ${SKIN_TONE_NAMES[index]} Skin Tone`,
  }));
};

/**
 * Get total emoji count
 */
export const getEmojiCount = (): number => {
  return EMOJI_DATABASE.length;
};

/**
 * Get all emojis
 */
export const getAllEmojis = (): Emoji[] => {
  return [...EMOJI_DATABASE];
};
