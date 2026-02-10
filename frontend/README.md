# Smart Khad Manager - Fertilizer Shop POS System 🌾

A complete, production-ready SaaS web application for fertilizer shops with AI Voice capabilities, Inventory Management, Customer Ledger, and comprehensive reporting features.

## 🚀 Features

### 🎯 Core Features

- **AI Voice Assistant** - Create bills by speaking in Hindi/English
  - Example: "Raju ko 10 Urea diya 5000 mein"
  - Powered by Groq AI (llama-3.3-70b-versatile)
  - Automatic transaction creation from voice commands

- **Smart Billing System**
  - Manual billing with real-time stock checking
  - PDF invoice generation (A5 format)
  - Partial payment support
  - Hold cart functionality
  - Auto-calculation of dues

- **Inventory Management**
  - Stock tracking with low stock alerts
  - Product CRUD operations
  - Multiple unit support (Kg, Bag, Litre, Piece)
  - Real-time stock updates on sales/purchases

- **Customer Ledger**
  - Due tracking per customer
  - Payment history
  - Customer-wise transaction reports

- **Reports & Day Book (रोजनामचा)**
  - Daily sales summary
  - Cash vs Online payment breakdown
  - Closing balance calculation
  - Export to CSV
  - Date range filtering

- **Staff Management**
  - Role-based access control (Owner vs Staff)
  - Staff cannot delete transactions
  - Staff cannot view profit margins
  - Individual staff accounts with credentials

- **Bilingual Support**
  - Hindi/English language toggle
  - Seamless language switching

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js (JWT Strategy)
- **Styling**: Tailwind CSS + shadcn/ui
- **Email Service**: Nodemailer
- **AI**: Groq API (llama-3.3-70b-versatile)
- **PDF Generation**: jsPDF + jspdf-autotable
- **Voice Recognition**: Browser Web Speech API

## 📋 Prerequisites

- Node.js 18+ and Yarn
- MongoDB running on localhost:27017
- Email credentials (Gmail SMTP)
- Groq API key

## 🔧 Installation

1. **Clone and Install**

```bash
cd /app
yarn install
```

2. **Environment Variables**
   The `.env` file is already configured with:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=khaad_manager
NEXTAUTH_SECRET=khaad-manager-secret-key-2025
NEXTAUTH_URL=https://khaadmanager.preview.emergentagent.com

# Email Configuration
EMAIL_USER=prakharparth010204@gmail.com
EMAIL_PASS=encg xwrx fvjy msqx

# Groq AI
GROQ_API_KEY=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
```

3. **Start the Application**

```bash
# Development
yarn dev

# Production
yarn build
yarn start
```

4. **Access the Application**

- Open browser: http://localhost:3000
- Or visit: https://khaadmanager.preview.emergentagent.com

## 📱 User Guide

### First Time Setup

1. **Sign Up**
   - Go to homepage and click "Sign Up"
   - Enter your details (Name, Email, Mobile, Password)
   - You'll receive a welcome email
   - Login with your credentials

2. **Configure Shop Settings**
   - Go to Settings page
   - Add your shop name, address, GST number
   - Optional: Add shop logo URL
   - These details appear on invoices

3. **Add Products**
   - Go to Inventory
   - Click "Add Product"
   - Enter item name, quantity, rate, unit
   - Set low stock threshold (default: 10)

4. **Add Customers (Optional)**
   - Go to Customers
   - Click "Add Customer"
   - Enter name, mobile, address
   - Used for due tracking

### Creating Bills

#### Method 1: Voice Command (AI Assistant)

1. Go to Billing page
2. Click "Voice Command" tab
3. Click the microphone button
4. Speak your command in Hindi/English:
   - "Raju ko 10 Urea diya 5000 mein"
   - "Mohan ko 20 DAP udhaar" (credit sale)
   - "500 ka chai kharcha" (expense)
   - "Ramesh ne 2000 online diye" (payment received)
5. System automatically creates transaction and updates stock

#### Method 2: Manual Billing

1. Go to Billing page
2. Click "Manual Billing" tab
3. Enter customer name
4. Add items (product, quantity, rate)
5. Enter payment mode (Cash/Online)
6. Enter amount paid
7. Click "Generate Bill"
8. PDF invoice downloads automatically

### Managing Inventory

- **Add Stock**: Create new product or use Purchase transaction
- **Update Stock**: Edit product quantity/rate
- **Low Stock Alerts**: Red badge appears on dashboard when stock is low
- **Delete Products**: Only owner can delete

### Customer Ledger

- View all customers with their due amounts
- Green badge = No dues (Clear)
- Red badge = Outstanding dues
- Use Payment transaction type to settle dues

### Reports & Day Book

1. Go to Reports
2. Select date range
3. View summary:
   - Total Sales
   - Total Cash Received
   - Total Online Received
   - Closing Balance
   - Total Expenses (Owner only)
4. Export to CSV for detailed analysis

### Staff Management (Owner Only)

1. Go to Settings
2. Click "Create Staff Account"
3. Enter staff details
4. Staff can login with their credentials
5. Staff limitations:
   - Cannot delete transactions/products
   - Cannot see profit margins
   - Cannot create other staff members

## 🔑 Authentication Features

### Signup

- Email verification via welcome email
- Secure password hashing (bcrypt)
- Automatic shop configuration setup

### Login

- Email and password authentication
- JWT-based session management
- Remember me functionality

### Forgot Password

1. Click "Forgot Password" on login page
2. Enter your email
3. Check email for 6-digit OTP
4. Enter OTP and new password
5. OTP expires in 15 minutes

## 🤖 AI Voice Commands

### Supported Commands

**Sale Transactions:**

- "Raju ko 10 Urea diya 5000 mein" → Sale with full payment
- "Mohan ko 20 DAP udhaar" → Credit sale (no payment)
- "Suresh ko 15 NPK diya 3000 online" → Online payment

**Purchase (Stock In):**

- "50 Urea aaya 25000 mein" → Add 50 units of Urea

**Expenses:**

- "200 rupya chai ka diya" → Chai expense
- "5000 ka kiraya diya" → Rent expense

**Payments Received:**

- "Ramesh ne 2000 diye" → Cash payment
- "Vijay ne 5000 online pay kiya" → Online payment

### Voice Recognition

- Supports Hindi and English
- Uses browser's native speech recognition
- Works on Chrome, Edge (best support)
- Fallback: Manual entry always available

## 📊 Database Schema

### User

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  mobile: String,
  role: 'OWNER' | 'STAFF',
  shopConfig: {
    shopName: String,
    address: String,
    logoUrl: String,
    gstNumber: String
  },
  ownerId: ObjectId (for staff)
}
```

### Product

```javascript
{
  ownerId: ObjectId,
  itemName: String,
  qty: Number,
  rate: Number,
  unit: String,
  lowStockThreshold: Number
}
```

### Customer

```javascript
{
  ownerId: ObjectId,
  name: String,
  mobile: String,
  address: String,
  totalDue: Number
}
```

### Transaction

```javascript
{
  ownerId: ObjectId,
  createdBy: ObjectId,
  date: Date,
  type: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'EXPENSE',
  customerName: String,
  customerId: ObjectId,
  items: [{
    itemName: String,
    qty: Number,
    rate: Number,
    amount: Number
  }],
  totalAmount: Number,
  paidAmount: Number,
  dueAmount: Number,
  paymentMode: 'CASH' | 'ONLINE',
  description: String
}
```

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**

- [x] Sign up with new email
- [x] Receive welcome email
- [x] Login with credentials
- [x] Forgot password (send OTP)
- [x] Reset password with OTP
- [x] Staff login with separate credentials

**Inventory:**

- [x] Add new product
- [x] Edit product details
- [x] Delete product (owner only)
- [x] Low stock alert appears when qty <= threshold

**Billing:**

- [x] Create manual bill
- [x] Generate PDF invoice
- [x] Partial payment (creates due)
- [x] Full payment (no due)
- [x] Stock decreases after sale
- [x] Voice command creates transaction

**Customer Ledger:**

- [x] Add customer
- [x] Customer due increases on credit sale
- [x] Due decreases on payment
- [x] View customer list with due badges

**Reports:**

- [x] Day book shows correct totals
- [x] Cash vs Online breakdown
- [x] Date range filtering
- [x] Export to CSV

**Staff Management:**

- [x] Owner creates staff account
- [x] Staff can create bills
- [x] Staff cannot delete transactions
- [x] Staff cannot view profit margins

### Test Credentials

```
Owner Account:
Email: rajesh@khaadshop.com
Password: rajesh123

(Create staff accounts through Settings page)
```

## 🎨 UI/UX Features

- **Mobile-First Design**: Fully responsive
- **Card-Based Layout**: Clean, modern interface
- **Color-Coded Stats**: Green (sales), Orange (dues), Red (alerts)
- **Language Toggle**: Switch between Hindi/English
- **Toast Notifications**: Success/error feedback
- **Loading States**: Spinners during async operations
- **Form Validation**: Client + Server-side
- **Sidebar Navigation**: Easy access to all features

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Route protection with middleware
- Role-based access control
- Session management
- CORS configuration
- Input validation
- SQL injection prevention (Mongoose)
- XSS protection

## 📦 Deployment

### Prerequisites

- MongoDB instance (local or Atlas)
- Node.js 18+ environment
- Email SMTP credentials
- Groq API key

### Environment Setup

Update `.env` with your production values:

- NEXTAUTH_URL: Your production domain
- MONGO_URL: MongoDB connection string
- EMAIL_USER/PASS: Your email credentials
- GROQ_API_KEY: Your Groq API key

### Build and Start

```bash
yarn build
yarn start
```

### Supervisor Configuration

The app runs under supervisor for auto-restart:

```bash
sudo supervisorctl status nextjs
sudo supervisorctl restart nextjs
```

## 🐛 Troubleshooting

### MongoDB Connection Failed

- Check if MongoDB is running: `sudo supervisorctl status mongodb`
- Verify MONGO_URL in .env
- Check MongoDB logs: `tail -f /var/log/mongodb/mongodb.log`

### Email Not Sending

- Verify EMAIL_USER and EMAIL_PASS in .env
- For Gmail, use App Password (not regular password)
- Check "Less secure app access" if using regular password

### Voice Recognition Not Working

- Use Chrome or Edge browser
- Grant microphone permission
- Check browser console for errors
- Fallback to manual entry

### PDF Not Generating

- Check browser console for errors
- Verify jsPDF is installed: `yarn list jspdf`
- Check if shop config is set in Settings

## 📞 Support

For issues or questions:

- Check the troubleshooting section
- Review the user guide
- Contact: prakharparth010204@gmail.com

## 🎯 Future Enhancements

- [ ] WhatsApp notification for bills
- [ ] Multi-shop support
- [ ] Barcode scanning
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Inventory forecasting
- [ ] Supplier management
- [ ] Purchase orders
- [ ] GST report generation

## 📄 License

© 2025 Smart Khad Manager. All rights reserved.

---

**Built with ❤️ for fertilizer shop owners in India**

🌾 Happy Selling! 🚜
