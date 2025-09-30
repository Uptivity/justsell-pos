# Migration Guide: Node.js/PostgreSQL to Laravel 11/MySQL

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Database Migration (PostgreSQL → MySQL)](#phase-1-database-migration)
3. [Phase 2: Backend Migration (Node.js → Laravel 11)](#phase-2-backend-migration)
4. [Phase 3: Frontend Integration](#phase-3-frontend-integration)
5. [Phase 4: Testing & Deployment](#phase-4-testing--deployment)
6. [Time Estimates & Resources](#time-estimates--resources)

---

## Overview

This guide provides a step-by-step approach to migrate the JustSell POS system from its current Node.js/Express/PostgreSQL stack to Laravel 11/MySQL.

### Current Architecture
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT tokens
- **API**: RESTful JSON API

### Target Architecture
- **Frontend**: React 19 + TypeScript + Vite (unchanged)
- **Backend**: Laravel 11 + PHP 8.2+
- **Database**: MySQL 8.0+
- **Authentication**: Laravel Sanctum
- **API**: RESTful JSON API (Laravel)

---

## Phase 1: Database Migration (PostgreSQL → MySQL)

### Step 1.1: Export PostgreSQL Data

```bash
# Export schema and data from PostgreSQL
pg_dump -U username -d justsell_pos > postgres_backup.sql

# Export as CSV for easier import
psql -U username -d justsell_pos -c "\copy users to 'users.csv' with csv header"
psql -U username -d justsell_pos -c "\copy products to 'products.csv' with csv header"
psql -U username -d justsell_pos -c "\copy customers to 'customers.csv' with csv header"
psql -U username -d justsell_pos -c "\copy transactions to 'transactions.csv' with csv header"
```

### Step 1.2: Convert Prisma Schema to MySQL

```prisma
// Update prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// MySQL-specific changes needed:
// 1. Change @db.Text to @db.LongText for large text fields
// 2. Change @db.Uuid to default(uuid()) for MySQL
// 3. Adjust DateTime precision if needed
```

### Step 1.3: Create MySQL Database

```sql
CREATE DATABASE justsell_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'justsell_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON justsell_pos.* TO 'justsell_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 1.4: Generate MySQL Migrations

```bash
# Update .env with MySQL connection
DATABASE_URL="mysql://justsell_user:password@localhost:3306/justsell_pos"

# Generate new migrations for MySQL
npx prisma migrate dev --name mysql_migration
```

### Step 1.5: Data Migration Script

```javascript
// scripts/migrate-to-mysql.js
const { PrismaClient: PostgresClient } = require('@prisma/client/postgres')
const { PrismaClient: MySQLClient } = require('@prisma/client/mysql')

const pgClient = new PostgresClient({ datasources: { db: { url: process.env.PG_URL } } })
const mysqlClient = new MySQLClient({ datasources: { db: { url: process.env.MYSQL_URL } } })

async function migrate() {
  // Migrate Users
  const users = await pgClient.user.findMany()
  for (const user of users) {
    await mysqlClient.user.create({ data: user })
  }

  // Migrate Products
  const products = await pgClient.product.findMany()
  for (const product of products) {
    await mysqlClient.product.create({ data: product })
  }

  // Continue for all tables...
  console.log('Migration completed!')
}

migrate()
```

---

## Phase 2: Backend Migration (Node.js → Laravel 11)

### Step 2.1: Setup Laravel 11 Project

```bash
# Install Laravel 11
composer create-project laravel/laravel justsell-laravel "11.*"
cd justsell-laravel

# Install required packages
composer require laravel/sanctum
composer require intervention/image
composer require barryvdh/laravel-cors
composer require spatie/laravel-permission

# Setup Sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### Step 2.2: Create Laravel Models

```php
// app/Models/User.php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasRoles;

    protected $fillable = [
        'email', 'password', 'firstName', 'lastName',
        'role', 'storeId', 'isActive', 'lastLogin'
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'isActive' => 'boolean',
        'lastLogin' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'cashierId');
    }
}
```

```php
// app/Models/Product.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name', 'sku', 'barcode', 'price', 'cost',
        'category', 'stock', 'minStock', 'ageRestricted',
        'taxable', 'description', 'storeId'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'stock' => 'integer',
        'minStock' => 'integer',
        'ageRestricted' => 'boolean',
        'taxable' => 'boolean',
    ];

    public function transactionItems()
    {
        return $this->hasMany(TransactionItem::class);
    }
}
```

```php
// app/Models/Transaction.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'receiptNumber', 'customerId', 'cashierId',
        'subtotal', 'taxAmount', 'totalAmount',
        'paymentMethod', 'cashTendered', 'changeGiven',
        'loyaltyPointsEarned', 'loyaltyPointsRedeemed',
        'ageVerificationCompleted', 'ageVerificationMethod',
        'storeId', 'status'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'taxAmount' => 'decimal:2',
        'totalAmount' => 'decimal:2',
        'cashTendered' => 'decimal:2',
        'changeGiven' => 'decimal:2',
        'loyaltyPointsEarned' => 'integer',
        'loyaltyPointsRedeemed' => 'integer',
        'ageVerificationCompleted' => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashierId');
    }

    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }
}
```

### Step 2.3: Create Laravel Migrations

```php
// database/migrations/2024_01_01_000001_create_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('firstName');
            $table->string('lastName');
            $table->enum('role', ['ADMIN', 'MANAGER', 'CASHIER'])->default('CASHIER');
            $table->unsignedBigInteger('storeId')->nullable();
            $table->boolean('isActive')->default(true);
            $table->timestamp('lastLogin')->nullable();
            $table->timestamps();

            $table->index('email');
            $table->index('storeId');
        });
    }
};
```

```php
// database/migrations/2024_01_01_000002_create_products_table.php
return new class extends Migration
{
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->unique();
            $table->string('barcode')->nullable()->unique();
            $table->decimal('price', 10, 2);
            $table->decimal('cost', 10, 2)->nullable();
            $table->string('category')->nullable();
            $table->integer('stock')->default(0);
            $table->integer('minStock')->default(0);
            $table->boolean('ageRestricted')->default(false);
            $table->boolean('taxable')->default(true);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('storeId')->nullable();
            $table->timestamps();

            $table->index(['sku', 'barcode']);
            $table->index('category');
            $table->index('storeId');
        });
    }
};
```

### Step 2.4: Create API Controllers

```php
// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'permissions' => $this->getUserPermissions($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'permissions' => $this->getUserPermissions($request->user()),
        ]);
    }

    private function getUserPermissions($user)
    {
        // Map role to permissions (matching Node.js implementation)
        $rolePermissions = [
            'ADMIN' => ['*'],
            'MANAGER' => [
                'product:create', 'product:read', 'product:update',
                'transaction:create', 'transaction:read',
                'customer:create', 'customer:read', 'customer:update',
                'report:read'
            ],
            'CASHIER' => [
                'product:read',
                'transaction:create', 'transaction:read',
                'customer:create', 'customer:read'
            ]
        ];

        return $rolePermissions[$user->role] ?? [];
    }
}
```

```php
// app/Http/Controllers/Api/ProductController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', $search);
            });
        }

        if ($request->has('category')) {
            $query->where('category', $request->input('category'));
        }

        $products = $query->orderBy('name')->paginate(50);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:products',
            'barcode' => 'nullable|string|unique:products',
            'price' => 'required|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'category' => 'nullable|string',
            'stock' => 'integer|min:0',
            'minStock' => 'integer|min:0',
            'ageRestricted' => 'boolean',
            'taxable' => 'boolean',
            'description' => 'nullable|string',
        ]);

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'sku' => 'string|unique:products,sku,' . $product->id,
            'barcode' => 'nullable|string|unique:products,barcode,' . $product->id,
            'price' => 'numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'category' => 'nullable|string',
            'stock' => 'integer|min:0',
            'minStock' => 'integer|min:0',
            'ageRestricted' => 'boolean',
            'taxable' => 'boolean',
            'description' => 'nullable|string',
        ]);

        $product->update($validated);

        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }
}
```

```php
// app/Http/Controllers/Api/TransactionController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Product;
use App\Models\Customer;
use App\Services\TaxCalculator;
use App\Services\ReceiptGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    private $taxCalculator;
    private $receiptGenerator;

    public function __construct(TaxCalculator $taxCalculator, ReceiptGenerator $receiptGenerator)
    {
        $this->taxCalculator = $taxCalculator;
        $this->receiptGenerator = $receiptGenerator;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customerId' => 'nullable|exists:customers,id',
            'cartItems' => 'required|array|min:1',
            'cartItems.*.productId' => 'required|exists:products,id',
            'cartItems.*.quantity' => 'required|integer|min:1',
            'paymentMethod' => 'required|in:CASH,CARD,GIFT_CARD',
            'cashTendered' => 'required_if:paymentMethod,CASH|numeric|min:0',
            'ageVerificationCompleted' => 'boolean',
            'ageVerificationMethod' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            // Calculate totals
            $subtotal = 0;
            $items = [];

            foreach ($validated['cartItems'] as $item) {
                $product = Product::findOrFail($item['productId']);

                // Check stock
                if ($product->stock < $item['quantity']) {
                    return response()->json([
                        'message' => "Insufficient stock for {$product->name}"
                    ], 400);
                }

                $lineTotal = $product->price * $item['quantity'];
                $subtotal += $lineTotal;

                $items[] = [
                    'product' => $product,
                    'quantity' => $item['quantity'],
                    'unitPrice' => $product->price,
                    'lineTotal' => $lineTotal,
                ];

                // Update stock
                $product->decrement('stock', $item['quantity']);
            }

            // Calculate tax
            $taxAmount = $this->taxCalculator->calculate($subtotal, $request->input('state', 'CA'));
            $totalAmount = $subtotal + $taxAmount;

            // Calculate change if cash payment
            $changeGiven = 0;
            if ($validated['paymentMethod'] === 'CASH') {
                $changeGiven = $validated['cashTendered'] - $totalAmount;
                if ($changeGiven < 0) {
                    return response()->json(['message' => 'Insufficient cash'], 400);
                }
            }

            // Handle loyalty points
            $loyaltyPointsEarned = 0;
            if ($validated['customerId']) {
                $customer = Customer::find($validated['customerId']);
                $loyaltyPointsEarned = floor($totalAmount);
                $customer->increment('loyaltyPoints', $loyaltyPointsEarned);
            }

            // Create transaction
            $transaction = Transaction::create([
                'receiptNumber' => $this->generateReceiptNumber(),
                'customerId' => $validated['customerId'],
                'cashierId' => $request->user()->id,
                'subtotal' => $subtotal,
                'taxAmount' => $taxAmount,
                'totalAmount' => $totalAmount,
                'paymentMethod' => $validated['paymentMethod'],
                'cashTendered' => $validated['cashTendered'] ?? null,
                'changeGiven' => $changeGiven,
                'loyaltyPointsEarned' => $loyaltyPointsEarned,
                'ageVerificationCompleted' => $validated['ageVerificationCompleted'] ?? false,
                'ageVerificationMethod' => $validated['ageVerificationMethod'] ?? null,
                'storeId' => $request->user()->storeId,
                'status' => 'COMPLETED',
            ]);

            // Create transaction items
            foreach ($items as $item) {
                $transaction->items()->create([
                    'productId' => $item['product']->id,
                    'quantity' => $item['quantity'],
                    'unitPrice' => $item['unitPrice'],
                    'lineTotal' => $item['lineTotal'],
                ]);
            }

            // Generate receipt
            $receipt = $this->receiptGenerator->generate($transaction);

            return response()->json([
                'transaction' => $transaction->load('items', 'customer', 'cashier'),
                'receipt' => $receipt,
                'loyaltyPointsEarned' => $loyaltyPointsEarned,
            ], 201);
        });
    }

    private function generateReceiptNumber()
    {
        $date = now()->format('Ymd');
        $count = Transaction::whereDate('created_at', today())->count() + 1;
        return sprintf('RCP-%s-%04d', $date, $count);
    }
}
```

### Step 2.5: Create API Routes

```php
// routes/api.php
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\CustomerController;

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Products
    Route::apiResource('products', ProductController::class);

    // Transactions
    Route::apiResource('transactions', TransactionController::class)->only(['index', 'store', 'show']);

    // Customers
    Route::apiResource('customers', CustomerController::class);
    Route::get('customers/search', [CustomerController::class, 'search']);
});
```

### Step 2.6: Create Service Classes

```php
// app/Services/TaxCalculator.php
namespace App\Services;

class TaxCalculator
{
    private $stateTaxRates = [
        'AL' => 0.04, 'AK' => 0.00, 'AZ' => 0.056, 'AR' => 0.065,
        'CA' => 0.0725, 'CO' => 0.029, 'CT' => 0.0635, 'DE' => 0.00,
        'FL' => 0.06, 'GA' => 0.04, 'HI' => 0.04, 'ID' => 0.06,
        // ... all states
    ];

    private $tobaccoTaxRates = [
        'AL' => 0.675, 'AK' => 2.00, 'AZ' => 2.00, 'AR' => 1.15,
        // ... tobacco-specific rates
    ];

    public function calculate($subtotal, $state = 'CA', $hasTobacco = false)
    {
        $stateTax = $subtotal * ($this->stateTaxRates[$state] ?? 0);

        if ($hasTobacco) {
            $tobaccoTax = $subtotal * ($this->tobaccoTaxRates[$state] ?? 0);
            return $stateTax + $tobaccoTax;
        }

        return $stateTax;
    }
}
```

```php
// app/Services/ReceiptGenerator.php
namespace App\Services;

use App\Models\Transaction;

class ReceiptGenerator
{
    public function generate(Transaction $transaction)
    {
        $html = view('receipts.template', [
            'transaction' => $transaction,
            'items' => $transaction->items()->with('product')->get(),
            'customer' => $transaction->customer,
            'cashier' => $transaction->cashier,
        ])->render();

        return [
            'html' => $html,
            'receiptNumber' => $transaction->receiptNumber,
        ];
    }
}
```

---

## Phase 3: Frontend Integration

### Step 3.1: Update API Configuration

```typescript
// src/config/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Update from JWT to Sanctum
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for Sanctum
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
})

// Add CSRF token handling for Laravel
apiClient.interceptors.request.use(async (config) => {
  // Get CSRF cookie if not present
  if (!document.cookie.includes('XSRF-TOKEN')) {
    await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`)
  }

  return config
})
```

### Step 3.2: Update Authentication Hooks

```typescript
// src/hooks/useAuth.ts
import { apiClient } from '../config/api'

export function useAuth() {
  const login = async (email: string, password: string) => {
    // Get CSRF token first
    await apiClient.get('/sanctum/csrf-cookie')

    const response = await apiClient.post('/auth/login', {
      email,
      password
    })

    // Store token (Sanctum uses cookies, but we can store for reference)
    localStorage.setItem('token', response.data.token)

    return response.data
  }

  const logout = async () => {
    await apiClient.post('/auth/logout')
    localStorage.removeItem('token')
  }

  return { login, logout }
}
```

### Step 3.3: Update API Endpoints

```typescript
// src/services/api.ts
// Update all endpoint URLs to match Laravel routes

// Old (Node.js)
export const productsAPI = {
  getAll: () => apiClient.get('/products'),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`)
}

// New (Laravel) - same structure, Laravel handles it
export const productsAPI = {
  getAll: () => apiClient.get('/products'),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`)
}
```

---

## Phase 4: Testing & Deployment

### Step 4.1: Laravel Testing Setup

```php
// tests/Feature/Api/AuthTest.php
namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['user', 'token', 'permissions']);
    }

    public function test_user_cannot_login_with_invalid_credentials()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401);
    }
}
```

```php
// tests/Feature/Api/TransactionTest.php
namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use Laravel\Sanctum\Sanctum;

class TransactionTest extends TestCase
{
    public function test_can_create_transaction()
    {
        $user = User::factory()->create(['role' => 'CASHIER']);
        $product = Product::factory()->create([
            'price' => 10.00,
            'stock' => 100,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/transactions', [
            'cartItems' => [
                ['productId' => $product->id, 'quantity' => 2]
            ],
            'paymentMethod' => 'CASH',
            'cashTendered' => 25.00,
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['transaction', 'receipt']);

        $this->assertDatabaseHas('transactions', [
            'cashierId' => $user->id,
            'totalAmount' => 21.60, // With 8% tax
        ]);
    }
}
```

### Step 4.2: Deployment Configuration

```bash
# .env.production for Laravel
APP_NAME=JustSellPOS
APP_ENV=production
APP_KEY=base64:generated_key_here
APP_DEBUG=false
APP_URL=https://pos.justsell.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=justsell_pos
DB_USERNAME=justsell_user
DB_PASSWORD=secure_password

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

SANCTUM_STATEFUL_DOMAINS=pos.justsell.com
SESSION_DOMAIN=.justsell.com
```

```nginx
# nginx configuration
server {
    listen 80;
    server_name pos.justsell.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pos.justsell.com;
    root /var/www/justsell/public;

    ssl_certificate /etc/ssl/certs/justsell.crt;
    ssl_certificate_key /etc/ssl/private/justsell.key;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Step 4.3: Migration Checklist

```markdown
## Pre-Migration Checklist
- [ ] Full backup of PostgreSQL database
- [ ] Full backup of application code
- [ ] Test environment ready with Laravel 11
- [ ] MySQL 8.0+ installed and configured
- [ ] PHP 8.2+ with required extensions
- [ ] Redis for caching/sessions

## Migration Steps
- [ ] Export PostgreSQL data
- [ ] Create MySQL database
- [ ] Run Laravel migrations
- [ ] Import data to MySQL
- [ ] Test all API endpoints
- [ ] Update frontend API configuration
- [ ] Test frontend-backend integration
- [ ] Run full test suite
- [ ] Performance testing
- [ ] Security audit

## Post-Migration Validation
- [ ] All users can login
- [ ] Products display correctly
- [ ] Transactions process successfully
- [ ] Reports generate accurately
- [ ] Loyalty points calculate correctly
- [ ] Age verification works
- [ ] Receipt printing functional
- [ ] QuickBooks integration operational

## Rollback Plan
- [ ] Keep PostgreSQL running in parallel
- [ ] Maintain Node.js API available
- [ ] Database sync scripts ready
- [ ] DNS switch prepared
- [ ] Communication plan for issues
```

---

## Time Estimates & Resources

### Phase Timeline
- **Phase 1 (Database)**: 2-3 days
  - Data export/import: 1 day
  - Schema conversion: 1 day
  - Testing: 1 day

- **Phase 2 (Backend)**: 7-10 days
  - Laravel setup: 1 day
  - Models & migrations: 2 days
  - Controllers & routes: 3 days
  - Services & business logic: 2 days
  - Testing: 2-3 days

- **Phase 3 (Frontend)**: 2-3 days
  - API configuration: 1 day
  - Authentication updates: 1 day
  - Testing: 1 day

- **Phase 4 (Deployment)**: 2-3 days
  - Environment setup: 1 day
  - Deployment: 1 day
  - Validation: 1 day

**Total Estimated Time**: 13-19 days (2-3 weeks)

### Team Requirements
- 1 Senior PHP/Laravel Developer
- 1 Database Administrator
- 1 Frontend Developer (for integration)
- 1 DevOps Engineer
- 1 QA Engineer

### Risk Factors
1. **Data Loss**: Mitigate with comprehensive backups
2. **Downtime**: Use blue-green deployment
3. **Performance Issues**: Benchmark before/after
4. **Integration Bugs**: Extensive testing required
5. **Authentication Changes**: May affect user sessions

### Cost Considerations
- Laravel hosting (typically higher than Node.js)
- MySQL licensing (if using MySQL Enterprise)
- Developer time (2-3 weeks × team size)
- Testing and QA resources
- Potential downtime costs

---

## Conclusion

While migration is technically feasible, consider:

### ✅ **Pros of Migration**
- Laravel's mature ecosystem
- Better enterprise support
- Eloquent ORM advantages
- Built-in features (queues, notifications, etc.)
- Large PHP developer pool

### ❌ **Cons of Migration**
- Significant development effort (2-3 weeks)
- Risk of introducing bugs
- Performance may differ
- Full-stack TypeScript advantages lost
- Retraining required for team

### 🎯 **Recommendation**
Only migrate if:
1. Team expertise is primarily PHP/Laravel
2. Enterprise support requirements
3. Specific Laravel features needed
4. Long-term strategic alignment with PHP stack

Otherwise, the current Node.js/TypeScript stack is modern, performant, and production-ready.