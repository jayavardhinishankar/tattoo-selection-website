const groups = {
  Calligraphy: ['Alex Brush', 'Allura', 'Ballet', 'Berkshire Swash', 'Bodoni Moda', 'Carattere', 'Italianno', 'Birthstone', 'Monsieur La Doulaise', 'Rochester'],
  'Cursive and script': ['Dancing Script', 'Great Vibes', 'Kaushan Script', 'Lobster', 'Pacifico', 'Playball', 'Satisfy', 'Cookie', 'Courgette', 'Marck Script'],
  Handwritten: ['Caveat', 'Coming Soon', 'Homemade Apple', 'Kalam', 'Patrick Hand', 'Shadows Into Light', 'Nothing You Could Do', 'Amatic SC', 'Gloria Hallelujah', 'Reenie Beanie'],
  Serif: ['Cormorant Garamond', 'DM Serif Display', 'Libre Baskerville', 'Lora', 'Merriweather', 'Playfair Display', 'Prata', 'Arvo', 'Crimson Text', 'EB Garamond'],
  'Sans-serif': ['Barlow', 'DM Sans', 'Inter', 'Manrope', 'Montserrat', 'Nunito Sans', 'Raleway', 'Figtree', 'Lato', 'Poppins'],
  'Gothic and blackletter': ['UnifrakturCook', 'UnifrakturMaguntia', 'Pirata One', 'Germania One', 'Grenze Gotisch', 'New Rocker', 'Texturina', 'Grenze', 'MedievalSharp', 'Metal Mania'],
  'Traditional tattoo lettering': ['Rye', 'Bowlby One SC', 'Bungee', 'Bungee Inline', 'Graduate', 'Staatliches', 'Teko', 'Bevan', 'Lilita One', 'Ranchers'],
  Minimalist: ['Abel', 'Assistant', 'Jost', 'Josefin Sans', 'Overpass', 'Questrial', 'Urbanist', 'Fira Sans', 'Roboto', 'Work Sans'],
  Decorative: ['Cinzel Decorative', 'Ewert', 'Fascinate', 'Fredericka the Great', 'Monoton', 'Ribeye', 'Uncial Antiqua', 'Bungee Hairline', 'Londrina Outline', 'Londrina Shadow'],
  Typewriter: ['Courier Prime', 'Cutive Mono', 'IBM Plex Mono', 'Inconsolata', 'Nanum Gothic Coding', 'Special Elite', 'Spline Sans Mono', 'Red Hat Mono', 'Space Mono', 'VT323'],
  'Bold lettering': ['Archivo Black', 'Black Ops One', 'Bowlby One', 'Fugaz One', 'Kanit', 'Oswald', 'Russo One', 'Black Han Sans', 'Passion One', 'Saira Stencil One'],
  'Brush lettering': ['Permanent Marker', 'Rock Salt', 'Sedgwick Ave', 'Sedgwick Ave Display', 'Trade Winds', 'Yellowtail', 'Yesteryear', 'Knewave', 'Merienda', 'Sriracha'],
  Vintage: ['Abril Fatface', 'Alfa Slab One', 'Bree Serif', 'Lobster Two', 'Righteous', 'Rozha One', 'Ultra', 'Patua One', 'Shrikhand', 'Yeseva One'],
  'Elegant signature': ['Cedarville Cursive', 'Clicker Script', 'Mrs Saint Delafield', 'Mr De Haviland', 'Qwigley', 'Tangerine', 'Rouge Script', 'Allison', 'Bonheur Royale', 'Parisienne'],
  Monospace: ['Anonymous Pro', 'Fira Mono', 'JetBrains Mono', 'Major Mono Display', 'Martian Mono', 'Roboto Mono', 'Share Tech Mono', 'DM Mono', 'Oxygen Mono', 'Ubuntu Mono'],
  'Display lettering': ['Anton', 'Bebas Neue', 'Bungee Shade', 'Changa One', 'Faster One', 'Racing Sans One', 'Squada One', 'Bangers', 'Fjalla One', 'Titan One'],
  'Installed system fonts': [
    'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 'Candara',
    'Cascadia Code', 'Cascadia Mono', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
    'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia',
    'HoloLens MDL2 Assets', 'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI',
    'Lucida Console', 'Lucida Sans Unicode', 'Malgun Gothic', 'Marlett', 'Microsoft Himalaya',
    'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif',
    'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB',
    'MingLiU_HKSCS-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MS PGothic', 'MS UI Gothic',
    'MV Boli', 'Myanmar Text', 'Nirmala UI', 'NSimSun', 'Palatino Linotype', 'PMingLiU-ExtB',
    'Segoe Fluent Icons', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI',
    'Segoe UI Emoji', 'Segoe UI Historic', 'Segoe UI Symbol', 'Segoe UI Variable', 'SimSun',
    'SimSun-ExtB', 'Sitka Banner', 'Sitka Display', 'Sitka Heading', 'Sitka Small',
    'Sitka Subheading', 'Sitka Text', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman',
    'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic', 'Yu Gothic UI',
  ],
};

export const fontCategories = Object.keys(groups);
export const fontLibrary = Object.entries(groups).flatMap(([category, families]) =>
  families.map((family) => ({
    family,
    category,
    source: category === 'Installed system fonts' ? 'system' : 'google',
  }))
);
