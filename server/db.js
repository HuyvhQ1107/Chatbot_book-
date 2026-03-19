const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'bookstore.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📚'
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category_id INTEGER,
    price INTEGER NOT NULL,
    original_price INTEGER,
    description TEXT,
    stock INTEGER DEFAULT 10,
    rating REAL DEFAULT 4.0,
    tags TEXT DEFAULT '',
    cover_color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT DEFAULT 'default',
    book_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT DEFAULT 'default',
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    total_amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    price INTEGER,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS user_behavior (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT DEFAULT 'default',
    action TEXT NOT NULL,
    book_id INTEGER,
    query TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(title, author, description, tags, content='books', content_rowid='id');
`);

// Seed data
function seedData() {
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  if (bookCount > 0) return;

  console.log('🌱 Seeding database with sample books...');

  // Categories
  const categories = [
    { name: 'Văn học Việt Nam', icon: '🇻🇳' },
    { name: 'Tiểu thuyết', icon: '📖' },
    { name: 'Khoa học', icon: '🔬' },
    { name: 'Kinh doanh', icon: '💼' },
    { name: 'Tâm lý - Kỹ năng sống', icon: '🧠' },
    { name: 'Lịch sử', icon: '🏛️' },
    { name: 'Thiếu nhi', icon: '🧒' },
    { name: 'Manga - Comic', icon: '🎌' },
    { name: 'Công nghệ', icon: '💻' },
    { name: 'Triết học', icon: '🤔' },
  ];

  const insertCat = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
  for (const cat of categories) {
    insertCat.run(cat.name, cat.icon);
  }

  // Books
  const books = [
    // Văn học Việt Nam (cat 1)
    { title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', category_id: 1, price: 65000, original_price: 85000, description: 'Cuộc phiêu lưu đầy thú vị của chú Dế Mèn qua rừng xanh, qua suối, gặp gỡ nhiều bạn bè côn trùng. Tác phẩm kinh điển của văn học thiếu nhi Việt Nam.', stock: 25, rating: 4.8, tags: 'thiếu nhi,kinh điển,phiêu lưu,việt nam', cover_color: '#22c55e' },
    { title: 'Số Đỏ', author: 'Vũ Trọng Phụng', category_id: 1, price: 89000, original_price: 110000, description: 'Tiểu thuyết trào phúng xuất sắc nhất của văn học Việt Nam, phản ánh xã hội thượng lưu Hà Nội những năm 1930.', stock: 15, rating: 4.7, tags: 'trào phúng,kinh điển,xã hội,hà nội', cover_color: '#ef4444' },
    { title: 'Chí Phèo', author: 'Nam Cao', category_id: 1, price: 55000, original_price: 70000, description: 'Truyện ngắn kinh điển về người nông dân Chí Phèo và bi kịch bị cự tuyệt quyền làm người trong xã hội cũ.', stock: 20, rating: 4.9, tags: 'kinh điển,bi kịch,nông thôn,triết lý', cover_color: '#a855f7' },
    { title: 'Tắt Đèn', author: 'Ngô Tất Tố', category_id: 1, price: 72000, original_price: 90000, description: 'Cuộc sống cơ cực của người nông dân Việt Nam dưới ách áp bức phong kiến và thực dân.', stock: 18, rating: 4.6, tags: 'kinh điển,nông thôn,xã hội,bi kịch', cover_color: '#f59e0b' },
    { title: 'Truyện Kiều', author: 'Nguyễn Du', category_id: 1, price: 120000, original_price: 150000, description: 'Kiệt tác văn học Việt Nam, kể về cuộc đời nàng Kiều - 3254 câu thơ lục bát bất hủ.', stock: 30, rating: 5.0, tags: 'kinh điển,thơ,tình yêu,số phận', cover_color: '#ec4899' },
    { title: 'Lão Hạc', author: 'Nam Cao', category_id: 1, price: 48000, original_price: 60000, description: 'Câu chuyện cảm động về ông lão nông dân nghèo và con chó Vàng, phản ánh thân phận người nông dân.', stock: 22, rating: 4.5, tags: 'kinh điển,nông thôn,cảm động,bi kịch', cover_color: '#14b8a6' },

    // Tiểu thuyết (cat 2)
    { title: 'Nhà Giả Kim', author: 'Paulo Coelho', category_id: 2, price: 79000, original_price: 99000, description: 'Hành trình theo đuổi giấc mơ của cậu bé chăn cừu Santiago đến Kim tự tháp Ai Cập. Best-seller toàn cầu.', stock: 35, rating: 4.8, tags: 'triết lý,giấc mơ,phiêu lưu,best-seller', cover_color: '#f59e0b' },
    { title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', category_id: 2, price: 86000, original_price: 108000, description: 'Cuốn sách về nghệ thuật giao tiếp và ứng xử kinh điển nhất mọi thời đại, đã bán hơn 30 triệu bản.', stock: 40, rating: 4.7, tags: 'giao tiếp,kỹ năng,best-seller,kinh điển', cover_color: '#3b82f6' },
    { title: 'Harry Potter và Hòn Đá Phù Thủy', author: 'J.K. Rowling', category_id: 2, price: 135000, original_price: 165000, description: 'Tập đầu tiên trong bộ truyện Harry Potter huyền thoại. Cậu bé phù thủy khám phá thế giới ma thuật.', stock: 28, rating: 4.9, tags: 'fantasy,phiêu lưu,ma thuật,thiếu nhi', cover_color: '#7c3aed' },
    { title: 'Hoàng Tử Bé', author: 'Antoine de Saint-Exupéry', category_id: 2, price: 62000, original_price: 78000, description: 'Câu chuyện triết lý nhẹ nhàng về tình bạn, tình yêu và ý nghĩa cuộc sống qua mắt nhìn trẻ thơ.', stock: 32, rating: 4.8, tags: 'triết lý,tình bạn,kinh điển,cảm động', cover_color: '#06b6d4' },
    { title: 'Bố Già', author: 'Mario Puzo', category_id: 2, price: 145000, original_price: 180000, description: 'Tiểu thuyết kinh điển về gia đình mafia Corleone, quyền lực và danh dự trong thế giới ngầm.', stock: 12, rating: 4.7, tags: 'mafia,kinh điển,quyền lực,kịch tính', cover_color: '#1e293b' },
    { title: '1984', author: 'George Orwell', category_id: 2, price: 95000, original_price: 120000, description: 'Tiểu thuyết dystopia kinh điển về xã hội toàn trị, nơi Big Brother theo dõi mọi hành động.', stock: 20, rating: 4.8, tags: 'dystopia,kinh điển,chính trị,triết lý', cover_color: '#dc2626' },
    { title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', author: 'Rosie Nguyễn', category_id: 2, price: 76000, original_price: 95000, description: 'Cuốn sách truyền cảm hứng cho giới trẻ Việt Nam về việc sống có mục đích và theo đuổi đam mê.', stock: 45, rating: 4.3, tags: 'tuổi trẻ,cảm hứng,việt nam,self-help', cover_color: '#f97316' },
    { title: 'Hai Vạn Dặm Dưới Đáy Biển', author: 'Jules Verne', category_id: 2, price: 98000, original_price: 125000, description: 'Cuộc phiêu lưu dưới đại dương trên tàu ngầm Nautilus cùng thuyền trưởng Nemo huyền bí.', stock: 14, rating: 4.5, tags: 'phiêu lưu,khoa học viễn tưởng,kinh điển,biển', cover_color: '#0284c7' },

    // Khoa học (cat 3)
    { title: 'Lược Sử Thời Gian', author: 'Stephen Hawking', category_id: 3, price: 115000, original_price: 145000, description: 'Cuốn sách phổ biến khoa học nổi tiếng nhất về vũ trụ, lỗ đen, và bản chất thời gian.', stock: 18, rating: 4.8, tags: 'vũ trụ,vật lý,nổi tiếng,khoa học phổ thông', cover_color: '#1e40af' },
    { title: 'Sapiens: Lược Sử Loài Người', author: 'Yuval Noah Harari', category_id: 3, price: 179000, original_price: 225000, description: 'Hành trình 70.000 năm của loài Homo Sapiens từ thời kỳ đồ đá đến kỷ nguyên công nghệ.', stock: 22, rating: 4.9, tags: 'lịch sử,nhân loại,tiến hóa,best-seller', cover_color: '#b45309' },
    { title: 'Cosmos', author: 'Carl Sagan', category_id: 3, price: 155000, original_price: 195000, description: 'Hành trình khám phá vũ trụ tuyệt đẹp, từ nguyên tử đến thiên hà, qua lời kể đầy chất thơ.', stock: 10, rating: 4.7, tags: 'vũ trụ,thiên văn,khoa học phổ thông,triết lý', cover_color: '#4f46e5' },
    { title: 'Gen: Lịch Sử Loài Người', author: 'Siddhartha Mukherjee', category_id: 3, price: 168000, original_price: 210000, description: 'Cuốn sách toàn diện về di truyền học, từ Mendel đến CRISPR, ảnh hưởng đến tương lai loài người.', stock: 8, rating: 4.6, tags: 'sinh học,gen,y học,khoa học', cover_color: '#059669' },
    { title: 'Thế Giới Như Tôi Thấy', author: 'Albert Einstein', category_id: 3, price: 92000, original_price: 115000, description: 'Tuyển tập các bài viết, thư từ và suy nghĩ của Einstein về khoa học, triết học và cuộc sống.', stock: 16, rating: 4.5, tags: 'vật lý,triết lý,tiểu sử,tư duy', cover_color: '#6366f1' },

    // Kinh doanh (cat 4)
    { title: 'Nghĩ Giàu Làm Giàu', author: 'Napoleon Hill', category_id: 4, price: 95000, original_price: 120000, description: '13 nguyên tắc vàng để đạt được thành công và giàu có, cuốn sách kinh doanh bán chạy nhất lịch sử.', stock: 38, rating: 4.5, tags: 'làm giàu,thành công,tư duy,kinh điển', cover_color: '#ca8a04' },
    { title: 'Khởi Nghiệp Tinh Gọn', author: 'Eric Ries', category_id: 4, price: 125000, original_price: 155000, description: 'Phương pháp khởi nghiệp hiện đại: xây dựng MVP, đo lường và học hỏi liên tục.', stock: 20, rating: 4.4, tags: 'khởi nghiệp,startup,lean,đổi mới', cover_color: '#16a34a' },
    { title: 'Từ Tốt Đến Vĩ Đại', author: 'Jim Collins', category_id: 4, price: 139000, original_price: 175000, description: 'Nghiên cứu 11 công ty chuyển đổi từ tốt sang vĩ đại và bí quyết đằng sau thành công bền vững.', stock: 15, rating: 4.6, tags: 'quản trị,lãnh đạo,chiến lược,kinh điển', cover_color: '#0369a1' },
    { title: 'Chiến Lược Đại Dương Xanh', author: 'W. Chan Kim', category_id: 4, price: 148000, original_price: 185000, description: 'Tạo ra không gian thị trường mới thay vì cạnh tranh đẫm máu - chiến lược kinh doanh đột phá.', stock: 12, rating: 4.5, tags: 'chiến lược,đổi mới,marketing,kinh doanh', cover_color: '#0891b2' },
    { title: 'Người Giàu Nhất Thành Babylon', author: 'George S. Clason', category_id: 4, price: 68000, original_price: 85000, description: 'Bài học tài chính cá nhân qua những câu chuyện ở thành Babylon cổ đại. Kinh điển về quản lý tiền.', stock: 30, rating: 4.4, tags: 'tài chính,tiết kiệm,kinh điển,ngụ ngôn', cover_color: '#d97706' },

    // Tâm lý - Kỹ năng sống (cat 5)
    { title: 'Đời Ngắn Đừng Ngủ Dài', author: 'Robin Sharma', category_id: 5, price: 72000, original_price: 90000, description: 'Những bài học về cách sống trọn vẹn mỗi ngày, quản lý thời gian và phát triển bản thân.', stock: 28, rating: 4.3, tags: 'phát triển bản thân,thời gian,động lực,cuộc sống', cover_color: '#e11d48' },
    { title: 'Sức Mạnh Của Thói Quen', author: 'Charles Duhigg', category_id: 5, price: 108000, original_price: 135000, description: 'Hiểu cơ chế hoạt động của thói quen và cách thay đổi chúng để cải thiện cuộc sống.', stock: 24, rating: 4.6, tags: 'thói quen,tâm lý,phát triển bản thân,khoa học', cover_color: '#7c3aed' },
    { title: 'Tư Duy Nhanh và Chậm', author: 'Daniel Kahneman', category_id: 5, price: 165000, original_price: 205000, description: 'Tác phẩm đoạt giải Nobel về hai hệ thống tư duy và cách chúng ảnh hưởng đến quyết định.', stock: 14, rating: 4.8, tags: 'tâm lý,tư duy,nobel,ra quyết định', cover_color: '#4338ca' },
    { title: 'Nghệ Thuật Tinh Tế Của Việc Đếch Quan Tâm', author: 'Mark Manson', category_id: 5, price: 85000, original_price: 105000, description: 'Cách tiếp cận ngược đời về cuộc sống: bớt quan tâm những thứ không đáng để sống tốt hơn.', stock: 35, rating: 4.4, tags: 'cuộc sống,triết lý,hài hước,self-help', cover_color: '#f97316' },
    { title: 'Cảm Xúc Là Kẻ Thù', author: 'Jia Jiang', category_id: 5, price: 78000, original_price: 98000, description: 'Vượt qua nỗi sợ bị từ chối và biến thất bại thành cơ hội phát triển bản thân.', stock: 20, rating: 4.2, tags: 'cảm xúc,tự tin,phát triển bản thân,từ chối', cover_color: '#dc2626' },
    { title: 'Đọc Vị Bất Kỳ Ai', author: 'David J. Lieberman', category_id: 5, price: 82000, original_price: 102000, description: 'Nghệ thuật phân tích ngôn ngữ cơ thể và tâm lý để hiểu người khác sâu sắc hơn.', stock: 26, rating: 4.3, tags: 'tâm lý,giao tiếp,ngôn ngữ cơ thể,phân tích', cover_color: '#0d9488' },

    // Lịch sử (cat 6)
    { title: 'Guns, Germs and Steel', author: 'Jared Diamond', category_id: 6, price: 185000, original_price: 230000, description: 'Tại sao một số nền văn minh thống trị thế giới? Câu trả lời từ địa lý, sinh học và lịch sử.', stock: 10, rating: 4.7, tags: 'văn minh,giải pulitzer,nhân loại,địa lý', cover_color: '#92400e' },
    { title: 'Việt Nam Sử Lược', author: 'Trần Trọng Kim', category_id: 6, price: 145000, original_price: 180000, description: 'Bộ sử Việt Nam toàn diện từ thời lập quốc đến đầu thế kỷ 20, viết bằng văn phong giản dị.', stock: 12, rating: 4.6, tags: 'việt nam,lịch sử,kinh điển,dân tộc', cover_color: '#b91c1c' },
    { title: 'Hồi Ký Bà Huyện Thanh Quan', author: 'Nhiều tác giả', category_id: 6, price: 88000, original_price: 110000, description: 'Tuyển tập thơ và giai thoại về nữ sĩ tài danh thời Nguyễn.', stock: 8, rating: 4.2, tags: 'thơ,nguyễn,nữ sĩ,giai thoại', cover_color: '#9333ea' },
    { title: '21 Bài Học Cho Thế Kỷ 21', author: 'Yuval Noah Harari', category_id: 6, price: 155000, original_price: 195000, description: 'Những thách thức lớn nhất của nhân loại trong thế kỷ 21: AI, tôn giáo, khủng bố và sự thật.', stock: 18, rating: 4.7, tags: 'tương lai,AI,nhân loại,xã hội', cover_color: '#1e40af' },

    // Thiếu nhi (cat 7)
    { title: 'Doraemon - Tập 1', author: 'Fujiko F. Fujio', category_id: 7, price: 22000, original_price: 25000, description: 'Chú mèo máy Doraemon đến từ tương lai với túi bảo bối thần kỳ giúp đỡ cậu bé Nobita.', stock: 50, rating: 4.6, tags: 'manga,thiếu nhi,hài hước,kinh điển', cover_color: '#2563eb' },
    { title: 'Conan - Thám Tử Lừng Danh Tập 1', author: 'Gosho Aoyama', category_id: 7, price: 25000, original_price: 30000, description: 'Cậu thám tử nhí Conan giải mã những vụ án bí ẩn với trí thông minh siêu việt.', stock: 45, rating: 4.7, tags: 'manga,trinh thám,thiếu nhi,bí ẩn', cover_color: '#1e3a5f' },
    { title: 'Nhóc Maruko', author: 'Momoko Sakura', category_id: 7, price: 20000, original_price: 24000, description: 'Cuộc sống thường ngày đáng yêu và hài hước của cô bé Maruko lớp 3.', stock: 38, rating: 4.4, tags: 'manga,thiếu nhi,hài hước,đời thường', cover_color: '#f472b6' },

    // Manga - Comic (cat 8)
    { title: 'One Piece - Tập 1', author: 'Eiichiro Oda', category_id: 8, price: 25000, original_price: 30000, description: 'Hành trình trở thành Vua Hải Tặc của Luffy Mũ Rơm và đồng đội trên Grand Line.', stock: 60, rating: 4.9, tags: 'manga,phiêu lưu,hài hước,hải tặc', cover_color: '#dc2626' },
    { title: 'Naruto - Tập 1', author: 'Masashi Kishimoto', category_id: 8, price: 25000, original_price: 30000, description: 'Câu chuyện về cậu bé ninja Naruto và giấc mơ trở thành Hokage của làng Lá.', stock: 42, rating: 4.8, tags: 'manga,ninja,phiêu lưu,hành động', cover_color: '#f97316' },
    { title: 'Dragon Ball - Tập 1', author: 'Akira Toriyama', category_id: 8, price: 25000, original_price: 30000, description: 'Cuộc phiêu lưu tìm ngọc rồng của cậu bé Son Goku - tác phẩm manga huyền thoại.', stock: 35, rating: 4.8, tags: 'manga,phiêu lưu,hành động,kinh điển', cover_color: '#f59e0b' },
    { title: 'Attack on Titan - Tập 1', author: 'Hajime Isayama', category_id: 8, price: 30000, original_price: 35000, description: 'Nhân loại chống lại những Titan khổng lồ ăn thịt người trong bức tường cuối cùng.', stock: 28, rating: 4.7, tags: 'manga,hành động,kinh dị,kịch tính', cover_color: '#374151' },

    // Công nghệ (cat 9)
    { title: 'Clean Code', author: 'Robert C. Martin', category_id: 9, price: 320000, original_price: 400000, description: 'Cẩm nang viết code sạch, dễ đọc và bảo trì - kinh điển cho mọi lập trình viên.', stock: 15, rating: 4.8, tags: 'lập trình,code,best practice,kinh điển', cover_color: '#0f172a' },
    { title: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt', category_id: 9, price: 285000, original_price: 355000, description: 'Từ người mới đến chuyên gia: hành trình trở thành lập trình viên thực thụ.', stock: 12, rating: 4.7, tags: 'lập trình,career,kỹ năng,kinh điển', cover_color: '#1e293b' },
    { title: 'Design Patterns', author: 'Gang of Four', category_id: 9, price: 350000, original_price: 430000, description: '23 design patterns kinh điển trong lập trình hướng đối tượng.', stock: 8, rating: 4.6, tags: 'lập trình,design pattern,OOP,kinh điển', cover_color: '#312e81' },
    { title: 'Trí Tuệ Nhân Tạo', author: 'Stuart Russell & Peter Norvig', category_id: 9, price: 380000, original_price: 475000, description: 'Giáo trình AI toàn diện nhất, bao gồm machine learning, NLP và robotics.', stock: 6, rating: 4.5, tags: 'AI,machine learning,giáo trình,khoa học', cover_color: '#4f46e5' },

    // Triết học (cat 10)
    { title: 'Thế Giới Của Sophie', author: 'Jostein Gaarder', category_id: 10, price: 135000, original_price: 168000, description: 'Hành trình khám phá triết học phương Tây qua câu chuyện hấp dẫn của cô bé Sophie.', stock: 20, rating: 4.6, tags: 'triết học,phương tây,giáo dục,hấp dẫn', cover_color: '#7c3aed' },
    { title: 'Ông Già Và Biển Cả', author: 'Ernest Hemingway', category_id: 10, price: 58000, original_price: 72000, description: 'Cuộc chiến đơn độc giữa ông già Santiago và con cá kiếm khổng lồ - giải Nobel Văn học.', stock: 25, rating: 4.7, tags: 'nobel,kinh điển,biển,ý chí', cover_color: '#0369a1' },
    { title: 'Siddhartha', author: 'Hermann Hesse', category_id: 10, price: 75000, original_price: 95000, description: 'Hành trình giác ngộ của chàng trai Siddhartha trong thế giới Ấn Độ cổ đại.', stock: 15, rating: 4.5, tags: 'triết học,phật giáo,giác ngộ,tâm linh', cover_color: '#d97706' },
    { title: 'Bên Rìa Cuốn Sách', author: 'Trần Nhã Thụy', category_id: 10, price: 82000, original_price: 102000, description: 'Tản mạn về sách, đọc sách và văn hóa đọc của người Việt Nam đương đại.', stock: 18, rating: 4.1, tags: 'tản văn,đọc sách,văn hóa,việt nam', cover_color: '#16a34a' },
  ];

  const insertBook = db.prepare(`
    INSERT INTO books (title, author, category_id, price, original_price, description, stock, rating, tags, cover_color)
    VALUES (@title, @author, @category_id, @price, @original_price, @description, @stock, @rating, @tags, @cover_color)
  `);

  const insertMany = db.transaction((books) => {
    for (const book of books) {
      insertBook.run(book);
    }
  });

  insertMany(books);

  // Build FTS index
  db.exec(`INSERT INTO books_fts(books_fts) VALUES('rebuild')`);

  console.log(`✅ Seeded ${books.length} books in ${categories.length} categories`);
}

seedData();

module.exports = db;
