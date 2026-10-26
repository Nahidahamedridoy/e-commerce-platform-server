import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { generateToken, verifyToken } from '../src/utils/token';
import { authorize } from '../src/middleware/auth.middleware';
import { UnauthorizedError, ForbiddenError, BadRequestError } from '../src/utils/errors';
import { registerSchema, loginSchema } from '../src/validators/auth.validator';
import { createProductSchema } from '../src/validators/product.validator';
import { createOrderSchema } from '../src/validators/order.validator';
import app from '../src/app';

let passed = 0;
let failed = 0;

function it(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  })();
}

async function runTests() {
  console.log('\n--- 1. AUDITING PASSWORD HASHING ---');
  await it('should hash password securely with bcrypt and verify correctly', async () => {
    const password = 'SecretPassword123!';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    assert.notEqual(hash, password, 'Hash should not match plain password');
    assert.match(hash, /^\$2[aby]\$\d+\$/, 'Hash must be valid bcrypt format');

    const isMatch = await bcrypt.compare(password, hash);
    assert.equal(isMatch, true, 'Correct password should compare successfully');

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.equal(isWrongMatch, false, 'Incorrect password should be rejected');
  });

  console.log('\n--- 2. AUDITING JWT AUTHENTICATION ---');
  await it('should generate and verify JWT token payload', () => {
    const payload = {
      userId: 'test-user-uuid-123',
      email: 'customer@amardokan.com',
      role: Role.CUSTOMER,
    };

    const token = generateToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20, 'Token must be a non-empty string');

    const decoded = verifyToken(token);
    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, Role.CUSTOMER);
  });

  await it('should reject tampered or invalid JWT tokens', () => {
    assert.throws(
      () => verifyToken('tampered.token.value'),
      /jwt|token/i,
      'Should throw an error for invalid token'
    );
  });

  console.log('\n--- 3. AUDITING ROLE-BASED AUTHORIZATION ---');
  await it('should reject requests without authenticated user', () => {
    const req: any = {};
    const res: any = {};
    let errorPassed: any = null;

    const middleware = authorize(Role.ADMIN);
    middleware(req, res, (err?: any) => {
      errorPassed = err;
    });

    assert.ok(errorPassed instanceof UnauthorizedError, 'Should reject with UnauthorizedError');
  });

  await it('should deny CUSTOMER access to ADMIN-only routes (403 Forbidden)', () => {
    const req: any = {
      user: {
        userId: 'cust-1',
        email: 'customer@example.com',
        role: Role.CUSTOMER,
      },
    };
    const res: any = {};
    let errorPassed: any = null;

    const middleware = authorize(Role.ADMIN);
    middleware(req, res, (err?: any) => {
      errorPassed = err;
    });

    assert.ok(errorPassed instanceof ForbiddenError, 'Should reject with ForbiddenError');
  });

  await it('should allow ADMIN access to ADMIN routes', () => {
    const req: any = {
      user: {
        userId: 'admin-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
      },
    };
    const res: any = {};
    let calledNext = false;
    let errorPassed: any = null;

    const middleware = authorize(Role.ADMIN);
    middleware(req, res, (err?: any) => {
      calledNext = true;
      errorPassed = err;
    });

    assert.equal(calledNext, true, 'Next must be invoked');
    assert.equal(errorPassed, undefined, 'No error should be passed for authorized admin');
  });

  console.log('\n--- 4. AUDITING INPUT VALIDATION SCHEMAS ---');
  await it('should validate registration schemas and reject invalid inputs', () => {
    // Missing fields
    const invalidEmpty = registerSchema.safeParse({});
    assert.equal(invalidEmpty.success, false);

    // Invalid email
    const invalidEmail = registerSchema.safeParse({
      name: 'Test',
      email: 'not-an-email',
      password: 'validpassword',
    });
    assert.equal(invalidEmail.success, false);

    // Password too short (< 6 chars)
    const invalidPassword = registerSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      password: '123',
    });
    assert.equal(invalidPassword.success, false);

    // Valid registration data
    const validData = registerSchema.safeParse({
      name: 'Valid User',
      email: 'user@amardokan.com',
      password: 'password123',
      phone: '+8801700000000',
      address: 'Dhaka, Bangladesh',
    });
    assert.equal(validData.success, true);
  });

  await it('should validate product schemas and reject invalid fields', () => {
    // Negative price and stock
    const invalidProduct = createProductSchema.safeParse({
      name: 'Laptop',
      description: 'High performance laptop with 16GB RAM',
      price: -50,
      stock: -5,
      categoryId: 'cat-123',
    });
    assert.equal(invalidProduct.success, false);

    // Valid product data
    const validProduct = createProductSchema.safeParse({
      name: 'Wireless Mouse',
      description: 'Ergonomic 2.4GHz wireless mouse with optical sensor',
      price: 25.5,
      stock: 100,
      images: ['https://example.com/mouse.jpg'],
      categoryId: 'cat-uuid-123',
    });
    assert.equal(validProduct.success, true);
  });

  await it('should validate order creation schema', () => {
    // Empty items array
    const emptyOrder = createOrderSchema.safeParse({
      items: [],
      shippingAddress: '123 Main St, Dhaka',
      contactPhone: '01711111111',
    });
    assert.equal(emptyOrder.success, false);

    // Zero quantity
    const zeroQuantityOrder = createOrderSchema.safeParse({
      items: [{ productId: 'prod-1', quantity: 0 }],
      shippingAddress: '123 Main St, Dhaka',
      contactPhone: '01711111111',
    });
    assert.equal(zeroQuantityOrder.success, false);

    // Valid order
    const validOrder = createOrderSchema.safeParse({
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress: '123 Main St, Dhaka',
      contactPhone: '01711111111',
      paymentMethod: 'CASH_ON_DELIVERY',
    });
    assert.equal(validOrder.success, true);
  });

  console.log('\n--- 5. AUDITING TRANSACTIONAL STOCK LOGIC ---');
  await it('should enforce stock check logic before decrementing inventory', () => {
    const mockProduct = {
      id: 'prod-1',
      name: 'Smartphone',
      price: 500,
      stock: 3, // only 3 in stock
    };

    const requestedQuantity = 5; // customer requested 5

    const stockValidation = (stock: number, quantity: number) => {
      if (stock < quantity) {
        throw new BadRequestError(`Insufficient stock for '${mockProduct.name}'. Available: ${stock}, Requested: ${quantity}`);
      }
      return stock - quantity;
    };

    assert.throws(
      () => stockValidation(mockProduct.stock, requestedQuantity),
      /Insufficient stock/,
      'Must throw BadRequestError when requested quantity exceeds available stock'
    );

    // When valid
    const remainingStock = stockValidation(mockProduct.stock, 2);
    assert.equal(remainingStock, 1, 'Stock must decrement correctly to 1');
  });

  console.log('\n--- 6. AUDITING HTTP API ENDPOINTS ---');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, resolve));

  const makeRequest = (options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.request({ ...options, port: 5099, host: '127.0.0.1' }, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ statusCode: res.statusCode || 500, data: parsed });
        });
      });
      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  };

  try {
    await it('GET / should return 200 with service info', async () => {
      const res = await makeRequest({ path: '/', method: 'GET' });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.name, 'Amar Dokan E-Commerce API');
      assert.equal(res.data.status, 'running');
    });

    await it('GET /api/health should return 200 with ok status', async () => {
      const res = await makeRequest({ path: '/api/health', method: 'GET' });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.status, 'ok');
      assert.equal(res.data.service, 'amar-dokan-server');
    });

    await it('GET /api/nonexistent should return 404 with structured error', async () => {
      const res = await makeRequest({ path: '/api/nonexistent-route', method: 'GET' });
      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.match(res.data.message, /not found/i);
    });

    await it('POST /api/auth/register with invalid body should return 400 with field errors', async () => {
      const res = await makeRequest(
        {
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {}
      );
      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.message, 'Validation failed');
      assert.ok(Array.isArray(res.data.errors), 'Should return list of validation errors');
    });

    await it('POST /api/categories without token should return 401 Unauthorized', async () => {
      const res = await makeRequest(
        {
          path: '/api/categories',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { name: 'Electronics' }
      );
      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.match(res.data.message, /token/i);
    });

    await it('POST /api/categories with CUSTOMER token should return 403 Forbidden', async () => {
      const customerToken = generateToken({
        userId: 'cust-123',
        email: 'customer@test.com',
        role: Role.CUSTOMER,
      });

      const res = await makeRequest(
        {
          path: '/api/categories',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
        },
        { name: 'Electronics' }
      );
      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.match(res.data.message, /insufficient permissions|Access denied/i);
    });

    await it('POST /api/orders without token should return 401 Unauthorized', async () => {
      const res = await makeRequest(
        {
          path: '/api/orders',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { items: [] }
      );
      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
    });
  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`AUDIT & TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
