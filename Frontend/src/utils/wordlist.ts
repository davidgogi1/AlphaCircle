// 256 short, common, unambiguous English words used to build recovery
// phrases. 256 = 2^8, so each word contributes exactly 8 bits of entropy;
// a 16-word phrase gives 128 bits total - a solid security margin without
// needing the full 2048-word BIP39 list for a chat app's threat model.
export const WORDLIST = [
  "apple","arrow","autumn","badge","banana","basket","beach","bear","bell","bench",
  "berry","bike","bird","block","blue","boat","bone","book","boot","branch",
  "brave","bread","bridge","brook","brown","brush","cabin","cactus","cake","camp",
  "candle","canyon","cargo","carpet","castle","cedar","chair","chalk","charm","cherry",
  "chess","chief","choir","circle","cliff","cloak","cloud","clover","coast","coffee",
  "comet","coral","cotton","crane","cream","creek","crown","crystal","dagger","daisy",
  "dance","dawn","delta","desert","diamond","dice","doctor","dolphin","donkey","dragon",
  "drum","eagle","earth","echo","ember","engine","evening","fable","falcon","feather",
  "fence","fern","field","finger","fire","flag","flame","flint","flower","forest",
  "forge","fossil","fox","frame","friend","frost","garden","gate","ghost","giant",
  "ginger","glacier","globe","glow","goat","gold","grain","grape","grass","gravel",
  "green","grove","guitar","harbor","harp","hazel","heart","hero","hill","holly",
  "honey","horse","house","hunter","ice","iris","island","ivory","jacket","jade",
  "jar","jasmine","jelly","jewel","journey","jungle","kettle","key","kite","knight",
  "lake","lamp","lantern","leaf","lemon","light","lily","lion","lizard","lobster",
  "lotus","maple","marble","market","meadow","melody","mint","mirror","mist","moon",
  "moose","moss","mountain","mouse","music","myrtle","nectar","nest","night","noble",
  "north","oak","ocean","olive","onion","opal","orange","orbit","otter","owl",
  "oyster","paddle","palm","panda","paper","parrot","peach","pearl","pebble","pepper",
  "petal","piano","pigeon","pillow","pine","planet","plant","plum","pond","poppy",
  "puzzle","quartz","queen","quiet","rabbit","raccoon","rain","raven","reef","rhythm",
  "ribbon","river","robin","rocket","rose","ruby","sail","salmon","sand","sapphire",
  "scout","shadow","shell","shield","ship","shore","silver","sky","snow","spark",
  "sparrow","spring","spruce","star","stone","storm","stream","summer","sunset","swan",
  "sword","tiger","timber","toast","tower","trail","train","tree","tulip","tundra",
  "turtle","valley","velvet","violet","walnut","wave","whale","wheat","willow","wind",
  "winter","wolf","wood","zebra","zephyr","amber",
] as const;
