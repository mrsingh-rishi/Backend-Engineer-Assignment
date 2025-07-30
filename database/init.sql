-- Food Delivery Database Schema
-- This script initializes the database with all required tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT NOT NULL,
    cuisine_type VARCHAR(50),
    is_online BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0.0,
    opening_time TIME,
    closing_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery agents table
CREATE TABLE delivery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_available BOOLEAN DEFAULT true,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    delivery_agent_id UUID REFERENCES delivery_agents(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address TEXT NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id),
    delivery_agent_id UUID REFERENCES delivery_agents(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_restaurants_email ON restaurants(email);
CREATE INDEX idx_restaurants_is_online ON restaurants(is_online);
CREATE INDEX idx_delivery_agents_email ON delivery_agents(email);
CREATE INDEX idx_delivery_agents_available ON delivery_agents(is_available);
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_delivery_agent_id ON orders(delivery_agent_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_restaurant_id ON ratings(restaurant_id);
CREATE INDEX idx_ratings_delivery_agent_id ON ratings(delivery_agent_id);

-- Sample data for testing
INSERT INTO restaurants (name, email, password_hash, phone, address, cuisine_type, is_online, opening_time, closing_time) VALUES
('Pizza Palace', 'pizza@example.com', '$2b$10$example.hash', '+1234567890', '123 Main St, City', 'Italian', true, '10:00', '23:00'),
('Burger Barn', 'burger@example.com', '$2b$10$example.hash', '+1234567891', '456 Oak Ave, City', 'American', true, '11:00', '24:00'),
('Sushi Spot', 'sushi@example.com', '$2b$10$example.hash', '+1234567892', '789 Pine Rd, City', 'Japanese', false, '12:00', '22:00');

INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available, image_url) VALUES
((SELECT id FROM restaurants WHERE email = 'pizza@example.com'), 'Margherita Pizza', 'Classic pizza with tomato, mozzarella, and basil', 12.99, 'Pizza', true, 'https://example.com/margherita.jpg'),
((SELECT id FROM restaurants WHERE email = 'pizza@example.com'), 'Pepperoni Pizza', 'Pizza with pepperoni and mozzarella', 14.99, 'Pizza', true, 'https://example.com/pepperoni.jpg'),
((SELECT id FROM restaurants WHERE email = 'burger@example.com'), 'Classic Burger', 'Beef patty with lettuce, tomato, and cheese', 9.99, 'Burgers', true, 'https://example.com/burger.jpg'),
((SELECT id FROM restaurants WHERE email = 'burger@example.com'), 'Chicken Sandwich', 'Grilled chicken breast with mayo and lettuce', 8.99, 'Sandwiches', true, 'https://example.com/chicken.jpg');

INSERT INTO delivery_agents (name, email, password_hash, phone, is_available) VALUES
('John Driver', 'john@delivery.com', '$2b$10$example.hash', '+1234567893', true),
('Jane Wheeler', 'jane@delivery.com', '$2b$10$example.hash', '+1234567894', true),
('Mike Rider', 'mike@delivery.com', '$2b$10$example.hash', '+1234567895', false);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_agents_updated_at BEFORE UPDATE ON delivery_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
