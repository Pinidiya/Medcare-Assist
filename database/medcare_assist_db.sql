-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 13, 2026 at 06:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `medcare_assist_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `digital_prescriptions`
--

CREATE TABLE `digital_prescriptions` (
  `digital_prescription_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `pharmacist_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `digital_prescriptions`
--

INSERT INTO `digital_prescriptions` (`digital_prescription_id`, `reservation_id`, `pharmacist_id`, `total_amount`, `created_at`) VALUES
(4, 16, 8, 45.00, '2026-06-02 10:57:56'),
(12, 19, 8, 3553.00, '2026-06-21 13:16:11'),
(13, 20, 8, 675.00, '2026-06-21 13:19:36'),
(14, 21, 9, 102.00, '2026-06-23 12:01:10'),
(15, 22, 9, 170.00, '2026-06-23 12:37:26'),
(16, 23, 8, 405.00, '2026-06-23 13:48:08'),
(17, 24, 8, 135.00, '2026-06-26 15:37:20'),
(19, 25, 8, 3553.00, '2026-06-27 16:10:39'),
(20, 28, 8, 45.00, '2026-08-10 16:34:28'),
(21, 27, 8, 45.00, '2026-08-10 16:37:24'),
(22, 29, 8, 45.00, '2026-08-13 16:27:06');

-- --------------------------------------------------------

--
-- Table structure for table `digital_prescription_items`
--

CREATE TABLE `digital_prescription_items` (
  `item_id` int(11) NOT NULL,
  `digital_prescription_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `digital_prescription_items`
--

INSERT INTO `digital_prescription_items` (`item_id`, `digital_prescription_id`, `medicine_id`, `quantity`, `unit_price`) VALUES
(5, 4, 34, 1, 45.00),
(13, 12, 3, 1, 3553.00),
(14, 13, 34, 15, 45.00),
(15, 14, 2, 3, 34.00),
(16, 15, 2, 5, 34.00),
(17, 16, 34, 9, 45.00),
(18, 17, 34, 3, 45.00),
(20, 19, 3, 1, 3553.00),
(21, 20, 34, 1, 45.00),
(22, 21, 34, 1, 45.00),
(23, 22, 34, 1, 45.00);

-- --------------------------------------------------------

--
-- Table structure for table `feedbacks`
--

CREATE TABLE `feedbacks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `feedback_text` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `feedbacks`
--

INSERT INTO `feedbacks` (`id`, `user_id`, `rating`, `feedback_text`, `status`, `created_at`, `updated_at`) VALUES
(1, 42, 3, 'fxf', 'approved', '2026-08-08 14:25:56', '2026-08-10 14:41:11');

-- --------------------------------------------------------

--
-- Table structure for table `hospitals`
--

CREATE TABLE `hospitals` (
  `hospital_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `type` enum('government','private','clinic') DEFAULT 'government',
  `district` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `operating_hours` text DEFAULT NULL,
  `has_emergency` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hospitals`
--

INSERT INTO `hospitals` (`hospital_id`, `name`, `address`, `phone`, `email`, `type`, `district`, `latitude`, `longitude`, `operating_hours`, `has_emergency`, `is_active`, `created_at`) VALUES
(1, 'National Hospital of Sri Lanka', 'Regent Street, Colombo 10', '011-2691111', NULL, 'government', 'Colombo', 6.91796430, 79.86157230, '24/7', 1, 1, '2026-06-16 15:21:33'),
(2, 'Colombo South Teaching Hospital', 'Kalubowila, Dehiwala', '011-2763261', NULL, 'government', 'Colombo', 6.85027680, 79.87145630, '24/7', 1, 1, '2026-06-16 15:21:33'),
(3, 'Sri Jayawardenepura General Hospital', 'Thalapathpitiya, Nugegoda', '011-2778610', NULL, 'government', 'Colombo', 6.87186420, 79.90234560, '24/7', 1, 1, '2026-06-16 15:21:33'),
(4, 'Teaching Hospital Kandy', 'William Gopallawa Mawatha, Kandy', '081-2222261', NULL, 'government', 'Kandy', 7.29203450, 80.63274580, '24/7', 1, 1, '2026-06-16 15:21:33'),
(5, 'Teaching Hospital Karapitiya', 'Karapitiya, Galle', '091-2232823', NULL, 'government', 'Galle', 6.05328740, 80.22586340, '24/7', 1, 1, '2026-06-16 15:21:33'),
(6, 'Teaching Hospital Jaffna', 'Hospital Road, Jaffna', '021-2222261', NULL, 'government', 'Jaffna', 9.66124530, 80.02145680, '24/7', 1, 1, '2026-06-16 15:21:33'),
(7, 'Kurunegala Teaching Hospital', 'Kurunegala', '037-2222261', NULL, 'government', 'Kurunegala', 7.48627340, 80.36247890, '24/7', 1, 1, '2026-06-16 15:21:33'),
(8, 'Ratnapura General Hospital', 'Ratnapura', '045-2222261', NULL, 'government', 'Ratnapura', 6.68127450, 80.39856740, '24/7', 1, 1, '2026-06-16 15:21:33'),
(9, 'Teaching Hospital Anuradhapura', 'Anuradhapura', '025-2222261', NULL, 'government', 'Anuradhapura', 8.33478920, 80.39871230, '24/7', 1, 1, '2026-06-16 15:21:33'),
(10, 'Teaching Hospital Batticaloa', 'Hospital Road, Batticaloa', '065-2222261', NULL, 'government', 'Batticaloa', 7.71234560, 81.69876540, '24/7', 1, 1, '2026-06-16 15:21:33'),
(11, 'Provincial General Hospital Badulla', 'Badulla', '055-2222261', NULL, 'government', 'Badulla', 6.98765430, 81.05432100, '24/7', 1, 1, '2026-06-16 15:21:33'),
(12, 'District General Hospital Matara', 'Matara', '041-2222261', NULL, 'government', 'Matara', 5.94821560, 80.54789210, '24/7', 1, 1, '2026-06-16 15:21:33'),
(13, 'Lanka Hospitals', 'Elvitigala Mawatha, Colombo 05', '011-5430000', NULL, 'private', 'Colombo', 6.89043210, 79.87654320, '24/7', 1, 1, '2026-06-16 15:21:33'),
(14, 'Asiri Medical Hospital', 'Kirimandala Mawatha, Colombo 05', '011-4524400', NULL, 'private', 'Colombo', 6.89123450, 79.87789010, '24/7', 1, 1, '2026-06-16 15:21:33'),
(15, 'Nawaloka Hospital', 'Deshamanya H. K. Dharmadasa Mawatha, Colombo 02', '011-5777777', NULL, 'private', 'Colombo', 6.92134560, 79.85432100, '24/7', 1, 1, '2026-06-16 15:21:33'),
(16, 'Durdans Hospital', 'Alfred Place, Colombo 03', '011-2140000', NULL, 'private', 'Colombo', 6.90567890, 79.85123450, '24/7', 1, 1, '2026-06-16 15:21:33'),
(17, 'Hemas Hospital Wattala', 'Avissawella Road, Wattala', '011-4888888', NULL, 'private', 'Gampaha', 6.98543210, 79.89234560, '24/7', 1, 1, '2026-06-16 15:21:33'),
(18, 'District General Hospital Gampaha', 'Miriswatta, Gampaha', '033-2222261', NULL, 'government', 'Gampaha', 7.08765430, 80.00123450, '24/7', 1, 1, '2026-06-16 15:21:33'),
(19, 'National Hospital of Sri Lanka', 'Regent Street, Colombo 10', '011-2691111', NULL, 'government', 'Colombo', 6.91796430, 79.86157230, '24/7', 1, 1, '2026-06-16 15:41:15'),
(20, 'Colombo South Teaching Hospital', 'Kalubowila, Dehiwala', '011-2763261', NULL, 'government', 'Colombo', 6.85027680, 79.87145630, '24/7', 1, 1, '2026-06-16 15:41:15'),
(21, 'Sri Jayawardenepura General Hospital', 'Thalapathpitiya, Nugegoda', '011-2778610', NULL, 'government', 'Colombo', 6.87186420, 79.90234560, '24/7', 1, 1, '2026-06-16 15:41:15'),
(22, 'Teaching Hospital Kandy', 'William Gopallawa Mawatha, Kandy', '081-2222261', NULL, 'government', 'Kandy', 7.29203450, 80.63274580, '24/7', 1, 1, '2026-06-16 15:41:15'),
(23, 'Teaching Hospital Karapitiya', 'Karapitiya, Galle', '091-2232823', NULL, 'government', 'Galle', 6.05328740, 80.22586340, '24/7', 1, 1, '2026-06-16 15:41:15'),
(24, 'Teaching Hospital Jaffna', 'Hospital Road, Jaffna', '021-2222261', NULL, 'government', 'Jaffna', 9.66124530, 80.02145680, '24/7', 1, 1, '2026-06-16 15:41:15'),
(25, 'Kurunegala Teaching Hospital', 'Kurunegala', '037-2222261', NULL, 'government', 'Kurunegala', 7.48627340, 80.36247890, '24/7', 1, 1, '2026-06-16 15:41:15'),
(26, 'Ratnapura General Hospital', 'Ratnapura', '045-2222261', NULL, 'government', 'Ratnapura', 6.68127450, 80.39856740, '24/7', 1, 1, '2026-06-16 15:41:15'),
(27, 'Teaching Hospital Anuradhapura', 'Anuradhapura', '025-2222261', NULL, 'government', 'Anuradhapura', 8.33478920, 80.39871230, '24/7', 1, 1, '2026-06-16 15:41:15'),
(28, 'Teaching Hospital Batticaloa', 'Hospital Road, Batticaloa', '065-2222261', NULL, 'government', 'Batticaloa', 7.71234560, 81.69876540, '24/7', 1, 1, '2026-06-16 15:41:15'),
(29, 'Provincial General Hospital Badulla', 'Badulla', '055-2222261', NULL, 'government', 'Badulla', 6.98765430, 81.05432100, '24/7', 1, 1, '2026-06-16 15:41:15'),
(30, 'District General Hospital Matara', 'Matara', '041-2222261', NULL, 'government', 'Matara', 5.94821560, 80.54789210, '24/7', 1, 1, '2026-06-16 15:41:15'),
(31, 'Lanka Hospitals', 'Elvitigala Mawatha, Colombo 05', '011-5430000', NULL, 'private', 'Colombo', 6.89043210, 79.87654320, '24/7', 1, 1, '2026-06-16 15:41:15'),
(32, 'Asiri Medical Hospital', 'Kirimandala Mawatha, Colombo 05', '011-4524400', NULL, 'private', 'Colombo', 6.89123450, 79.87789010, '24/7', 1, 1, '2026-06-16 15:41:15'),
(33, 'Nawaloka Hospital', 'Deshamanya H. K. Dharmadasa Mawatha, Colombo 02', '011-5777777', NULL, 'private', 'Colombo', 6.92134560, 79.85432100, '24/7', 1, 1, '2026-06-16 15:41:15'),
(34, 'Durdans Hospital', 'Alfred Place, Colombo 03', '011-2140000', NULL, 'private', 'Colombo', 6.90567890, 79.85123450, '24/7', 1, 1, '2026-06-16 15:41:15'),
(35, 'Hemas Hospital Wattala', 'Avissawella Road, Wattala', '011-4888888', NULL, 'private', 'Gampaha', 6.98543210, 79.89234560, '24/7', 1, 1, '2026-06-16 15:41:15'),
(36, 'District General Hospital Gampaha', 'Miriswatta, Gampaha', '033-2222261', NULL, 'government', 'Gampaha', 7.08765430, 80.00123450, '24/7', 1, 1, '2026-06-16 15:41:15');

-- --------------------------------------------------------

--
-- Table structure for table `master_medicines`
--

CREATE TABLE `master_medicines` (
  `medicine_id` int(11) NOT NULL,
  `brand_name` varchar(200) NOT NULL,
  `generic_name` varchar(200) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `requires_prescription` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `master_medicines`
--

INSERT INTO `master_medicines` (`medicine_id`, `brand_name`, `generic_name`, `category`, `description`, `requires_prescription`, `is_active`, `created_at`) VALUES
(1, 'Panadol 500mg', 'Paracetamol 500mg', 'Analgesics', 'Pain relief and fever reducer', 0, 1, '2026-05-21 10:35:05'),
(2, 'Amoxil 500mg', 'Amoxicillin 500mg', 'Antibiotics', 'Broad-spectrum antibiotic', 1, 1, '2026-05-21 10:35:05'),
(3, 'Cetirizine 10mg', 'Cetirizine Hydrochloride 10mg', 'Antihistamines', 'Allergy and hay fever relief', 0, 1, '2026-05-21 10:35:05'),
(4, 'Omeprazole 20mg', 'Omeprazole 20mg', 'Gastric', 'Acid reflux and heartburn treatment', 0, 1, '2026-05-21 10:35:05'),
(5, 'Azithromycin 500mg', 'Azithromycin 500mg', 'Antibiotics', 'Antibiotic for bacterial infections', 1, 1, '2026-05-21 10:35:05'),
(6, 'Ibuprofen 400mg', 'Ibuprofen 400mg', 'Analgesics', 'Pain and inflammation relief', 0, 1, '2026-05-21 10:35:05'),
(7, 'Dolo 650mg', 'Paracetamol 650mg', 'Analgesics', 'High dose pain relief and fever', 0, 1, '2026-05-21 10:35:05'),
(8, 'ORS Sachet', 'Oral Rehydration Salts', 'Supplements', 'Rehydration therapy for dehydration', 0, 1, '2026-05-21 10:35:05'),
(9, 'Metformin 500mg', 'Metformin Hydrochloride 500mg', 'Diabetes', 'Type 2 diabetes blood sugar management', 1, 1, '2026-05-21 10:35:05'),
(10, 'Amlodipine 5mg', 'Amlodipine Besylate 5mg', 'Cardiovascular', 'Blood pressure (hypertension) control', 1, 1, '2026-05-21 10:35:05'),
(11, 'Vitamin D3 1000IU', 'Cholecalciferol 1000IU', 'Vitamins', 'Vitamin D3 bone health supplement', 0, 1, '2026-05-21 10:35:05'),
(12, 'Folic Acid 5mg', 'Folic Acid 5mg', 'Vitamins', 'Folic acid supplement for pregnancy', 0, 1, '2026-05-21 10:35:05'),
(13, 'Lisinopril 10mg', 'Lisinopril 10mg', 'Cardiovascular', 'ACE inhibitor for hypertension and heart failure', 1, 1, '2026-05-21 10:35:05'),
(14, 'Atorvastatin 20mg', 'Atorvastatin Calcium 20mg', 'Cardiovascular', 'Statin for cholesterol management', 1, 1, '2026-05-21 10:35:05'),
(15, 'Salbutamol Inhaler', 'Salbutamol 100mcg/dose', 'Respiratory', 'Bronchodilator for asthma and COPD relief', 1, 1, '2026-05-21 10:35:05'),
(16, 'Chlorphenamine 4mg', 'Chlorphenamine Maleate 4mg', 'Antihistamines', 'Antihistamine for allergic reactions', 0, 1, '2026-05-21 10:35:05'),
(17, 'Zinc Sulphate 20mg', 'Zinc Sulphate 20mg', 'Supplements', 'Zinc supplement for immune support', 0, 1, '2026-05-21 10:35:05'),
(18, 'Diclofenac 50mg', 'Diclofenac Sodium 50mg', 'Analgesics', 'Anti-inflammatory for pain and swelling', 1, 1, '2026-05-21 10:35:05'),
(19, 'Ranitidine 150mg', 'Ranitidine Hydrochloride 150mg', 'Gastric', 'H2 blocker for stomach ulcers', 0, 1, '2026-05-21 10:35:05'),
(20, 'Multivitamin Tablet', 'Multivitamin Complex', 'Vitamins', 'Daily multivitamin and mineral supplement', 0, 1, '2026-05-21 10:35:05'),
(21, 'Panadol 500mg', 'Paracetamol 500mg', 'Analgesics', 'Pain relief and fever reducer', 0, 1, '2026-05-23 13:27:32'),
(22, 'Amoxil 500mg', 'Amoxicillin 500mg', 'Antibiotics', 'Broad-spectrum antibiotic', 1, 1, '2026-05-23 13:27:32'),
(23, 'Cetirizine 10mg', 'Cetirizine Hydrochloride 10mg', 'Antihistamines', 'Allergy and hay fever relief', 0, 1, '2026-05-23 13:27:32'),
(24, 'Omeprazole 20mg', 'Omeprazole 20mg', 'Gastric', 'Acid reflux and heartburn treatment', 0, 1, '2026-05-23 13:27:32'),
(25, 'Azithromycin 500mg', 'Azithromycin 500mg', 'Antibiotics', 'Antibiotic for bacterial infections', 1, 1, '2026-05-23 13:27:32'),
(26, 'Panadol 500mg', 'Paracetamol 500mg', 'Analgesics', 'Pain relief and fever reducer', 0, 1, '2026-05-23 14:01:30'),
(27, 'Amoxil 500mg', 'Amoxicillin 500mg', 'Antibiotics', 'Broad-spectrum antibiotic', 1, 1, '2026-05-23 14:01:30'),
(28, 'Cetirizine 10mg', 'Cetirizine Hydrochloride 10mg', 'Antihistamines', 'Allergy and hay fever relief', 0, 1, '2026-05-23 14:01:30'),
(29, 'Omeprazole 20mg', 'Omeprazole 20mg', 'Gastric', 'Acid reflux and heartburn treatment', 0, 1, '2026-05-23 14:01:30'),
(30, 'Azithromycin 500mg', 'Azithromycin 500mg', 'Antibiotics', 'Antibiotic for bacterial infections', 1, 1, '2026-05-23 14:01:30'),
(31, 'Ibuprofen 400mg', 'Ibuprofen 400mg', 'Analgesics', 'Pain and inflammation relief', 0, 1, '2026-05-23 14:01:30'),
(32, 'Dolo 650mg', 'Paracetamol 650mg', 'Analgesics', 'High dose pain relief and fever', 0, 1, '2026-05-23 14:01:30'),
(33, 'Metformin 500mg', 'Metformin Hydrochloride 500mg', 'Diabetes', 'Type 2 diabetes blood sugar management', 1, 1, '2026-05-23 14:01:30'),
(34, 'Amlodipine 5mg', 'Amlodipine Besylate 5mg', 'Cardiovascular', 'Blood pressure (hypertension) control', 1, 1, '2026-05-23 14:01:30'),
(35, 'Vitamin D3 1000IU', 'Cholecalciferol 1000IU', 'Vitamins', 'Vitamin D3 bone health supplement', 0, 1, '2026-05-23 14:01:30');

-- --------------------------------------------------------

--
-- Table structure for table `medical_locker`
--

CREATE TABLE `medical_locker` (
  `locker_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `document_name` varchar(150) NOT NULL,
  `document_url` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medical_locker`
--

INSERT INTO `medical_locker` (`locker_id`, `patient_id`, `document_name`, `document_url`, `created_at`) VALUES
(6, 42, 'localhost_5173_ (4).png', '0648fef70750ca1a888b8e2bc9abc3c6_1782579290.png', '2026-06-27 16:54:50'),
(8, 45, '_F__programming_Web_port_index.html.png', '71c205d9b5be2b8b12339697ce06b4fc_1783667770.png', '2026-07-10 07:16:10'),
(9, 45, 'localhost_5173_ (2).png', 'b5a83faec8aa10738c72f6c5e45a63d2_1783667781.png', '2026-07-10 07:16:21');

-- --------------------------------------------------------

--
-- Table structure for table `medicine_batches`
--

CREATE TABLE `medicine_batches` (
  `batch_id` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `batch_number` varchar(50) NOT NULL,
  `quantity_in_stock` int(11) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `expiry_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medicine_batches`
--

INSERT INTO `medicine_batches` (`batch_id`, `pharmacy_id`, `medicine_id`, `supplier_id`, `batch_number`, `quantity_in_stock`, `selling_price`, `expiry_date`, `created_at`) VALUES
(4, 10, 34, NULL, 'BATCH-6A1E9B7B359BF', 406, 0.00, '2026-06-08', '2026-06-02 08:59:39'),
(9, 11, 2, NULL, 'BATCH-20260603-CB83C3', 92, 34.00, '2026-06-30', '2026-06-03 14:30:52'),
(10, 10, 3, 12, 'BATCH-20260607-FCFF6E', 535, 3553.00, '2026-06-25', '2026-06-07 18:45:03');

-- --------------------------------------------------------

--
-- Table structure for table `medicine_requests`
--

CREATE TABLE `medicine_requests` (
  `request_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `medicine_name` varchar(200) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `requires_prescription` tinyint(1) DEFAULT 0,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nmra_registry`
--

CREATE TABLE `nmra_registry` (
  `nmra_id` int(11) NOT NULL,
  `pharmacy_name` varchar(150) NOT NULL,
  `address` text NOT NULL,
  `owner_name` varchar(100) NOT NULL,
  `pharmacist_name` varchar(100) NOT NULL,
  `slmc_number` varchar(100) NOT NULL,
  `nmra_reg_number` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `nmra_registry`
--

INSERT INTO `nmra_registry` (`nmra_id`, `pharmacy_name`, `address`, `owner_name`, `pharmacist_name`, `slmc_number`, `nmra_reg_number`, `created_at`) VALUES
(1, 'MedCare Pharmacy Colombo', '123 Galle Road, Colombo 03', 'Nipuna De Silva', 'Saman Perera', 'SLMC-PH-8849', 'NMRA-REG-2026-001', '2026-05-23 13:27:32'),
(2, 'MediStore Pharmacy Kandy', '45 Peradeniya Road, Kandy', 'Kamal Perera', 'Sunil Alwis', 'SLMC-PH-9921', 'NMRA-REG-2026-002', '2026-05-23 13:27:32');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text NOT NULL,
  `type` varchar(50) DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `prescription_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `status` enum('pending','processing','ready_for_pickup','completed','cancelled','quoted','pending_verification','reserved','rejected') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `advance_payment_slip` varchar(255) DEFAULT NULL,
  `pickup_pin` varchar(4) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `patient_id`, `pharmacy_id`, `prescription_id`, `total_amount`, `status`, `notes`, `advance_payment_slip`, `pickup_pin`, `created_at`, `updated_at`) VALUES
(1, 42, 10, NULL, 45.00, 'reserved', 'Created from Reservation #27', NULL, '9537', '2026-08-11 18:06:16', '2026-08-11 18:06:16');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `item_type` enum('prescribed','manual_otc') NOT NULL DEFAULT 'prescribed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `medicine_id`, `quantity`, `unit_price`, `item_type`) VALUES
(1, 1, 34, 1, 45.00, 'prescribed');

-- --------------------------------------------------------

--
-- Table structure for table `order_messages`
--

CREATE TABLE `order_messages` (
  `message_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `sender_role` enum('patient','pharmacist') NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `patient_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`patient_id`, `user_id`, `phone_number`, `address`, `birthday`, `age`, `created_at`) VALUES
(2, 26, NULL, NULL, NULL, NULL, '2026-06-02 07:35:33'),
(3, 42, NULL, NULL, NULL, NULL, '2026-06-23 11:59:54');

-- --------------------------------------------------------

--
-- Table structure for table `pharmacies`
--

CREATE TABLE `pharmacies` (
  `pharmacy_id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `pharmacy_name` varchar(200) NOT NULL,
  `address` text NOT NULL,
  `district` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `license_doc_path` varchar(500) DEFAULT NULL,
  `nmra_reg_number` varchar(100) NOT NULL,
  `verification_status` enum('incomplete','pending_admin_approval','fully_verified','rejected') DEFAULT 'incomplete',
  `nmra_license` varchar(100) DEFAULT NULL,
  `nmra_expiry_date` date DEFAULT NULL,
  `business_registration` varchar(100) DEFAULT NULL,
  `owner_nic` varchar(20) DEFAULT NULL,
  `owner_photo` varchar(500) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pharmacies`
--

INSERT INTO `pharmacies` (`pharmacy_id`, `owner_id`, `pharmacy_name`, `address`, `district`, `phone`, `latitude`, `longitude`, `license_doc_path`, `nmra_reg_number`, `verification_status`, `nmra_license`, `nmra_expiry_date`, `business_registration`, `owner_nic`, `owner_photo`, `status`, `rejection_reason`, `created_at`) VALUES
(10, 32, 'City Health Pharmacy', '15 Main St, Matale', 'Matale', '1234566789', 7.46014326, 80.62656784, 'uploads/pharmacy_docs/license_1780330215_6a1daee7a0800.png', '7896', 'fully_verified', NULL, '2026-10-29', '12465', '123456', 'uploads/owner_photos/owner_1780330215_6a1daee7a0107.png', 'pending', NULL, '2026-06-01 16:10:16'),
(11, 35, 'Sunrise Care Pharmacy', '45 Galle Road, Galle', 'Galle', '14565198', 6.03258464, 80.21499467, 'uploads/pharmacy_docs/license_1780331541_6a1db415076f6.png', '564865', 'fully_verified', NULL, '2027-10-14', '165145', '985684255', NULL, 'pending', NULL, '2026-06-01 16:32:21'),
(12, 36, 'LifeLine Pharmacy', '12 Kandy Road, Nuwara Eliya', 'Nuwara Eliya', '54984654', 6.96607925, 80.76718426, 'uploads/pharmacy_docs/license_1780331638_6a1db47665e57.png', '488', 'fully_verified', NULL, '2028-06-01', '468461', '456823', 'uploads/owner_photos/owner_1780331638_6a1db4766577d.png', 'pending', NULL, '2026-06-01 16:33:59'),
(13, 46, 'Nipuna pharmacy', 'kadugannawa', 'Kandy', '1234567890', 8.22413086, 80.82861325, 'uploads/pharmacy_docs/license_1786372776_6a79e2a869e47.jpg', '454623', 'incomplete', NULL, '2026-08-31', '5995', '123456789', 'uploads/owner_photos/owner_1786372776_6a79e2a86981a.jpg', 'pending', NULL, '2026-08-10 14:39:36'),
(14, 47, 'Nipuna pharmacy', 'kadugannawa', 'Kandy', '1234567892', 7.29312080, 80.63503580, NULL, '1235', 'fully_verified', NULL, '2026-12-03', '65', '12345678956', NULL, 'pending', NULL, '2026-08-10 15:24:33');

-- --------------------------------------------------------

--
-- Table structure for table `pharmacists`
--

CREATE TABLE `pharmacists` (
  `pharmacist_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pharmacy_id` int(11) DEFAULT NULL,
  `slmc_number` varchar(100) NOT NULL,
  `is_verified_by_admin` tinyint(1) DEFAULT 0,
  `certificate_path` varchar(500) DEFAULT NULL,
  `photo_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pharmacists`
--

INSERT INTO `pharmacists` (`pharmacist_id`, `user_id`, `pharmacy_id`, `slmc_number`, `is_verified_by_admin`, `created_at`) VALUES
(8, 33, 10, '47856', 1, '2026-06-01 16:30:16'),
(9, 37, 11, '8327837', 1, '2026-06-01 16:37:24'),
(10, 39, 12, '46546', 1, '2026-06-01 16:38:51'),
(11, 48, 14, '45266', 1, '2026-08-10 15:27:05');

--
-- Triggers `pharmacists`
--
DELIMITER $$
CREATE TRIGGER `trg_pharmacist_auto_offline` AFTER UPDATE ON `pharmacists` FOR EACH ROW BEGIN

    

    IF OLD.pharmacy_id IS NOT NULL AND NEW.pharmacy_id IS NULL THEN

        UPDATE pharmacies 

        SET verification_status = 'verified_pending_pharmacist' 

        WHERE pharmacy_id = OLD.pharmacy_id;

    END IF;

END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `pharmacist_details`
--

CREATE TABLE `pharmacist_details` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `slmc_registration_number` varchar(50) NOT NULL,
  `nic` varchar(20) NOT NULL,
  `certificate_path` varchar(500) DEFAULT NULL,
  `photo_path` varchar(500) DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pharmacy_inventory`
--

CREATE TABLE `pharmacy_inventory` (
  `inventory_id` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `stock_quantity` int(11) DEFAULT 0,
  `unit_price` decimal(10,2) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `low_stock_threshold` int(11) DEFAULT 20,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pharmacy_inventory`
--

INSERT INTO `pharmacy_inventory` (`inventory_id`, `pharmacy_id`, `medicine_id`, `stock_quantity`, `unit_price`, `expiry_date`, `low_stock_threshold`, `updated_at`) VALUES
(4, 10, 34, 506, 45.00, '2026-06-08', 20, '2026-06-26 15:37:19'),
(10, 11, 2, 92, 34.00, '2026-06-24', 20, '2026-06-23 12:37:26'),
(13, 10, 3, 535, 3553.00, '2026-06-25', 20, '2026-06-27 16:10:39');

-- --------------------------------------------------------

--
-- Table structure for table `pharmacy_staff`
--

CREATE TABLE `pharmacy_staff` (
  `staff_id` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pharmacy_staff`
--

INSERT INTO `pharmacy_staff` (`staff_id`, `pharmacy_id`, `user_id`, `is_active`, `created_at`) VALUES
(18, 10, 33, 0, '2026-06-01 16:30:16'),
(19, 10, 34, 1, '2026-06-01 16:30:40'),
(20, 11, 37, 0, '2026-06-01 16:37:24'),
(21, 11, 38, 1, '2026-06-01 16:37:53'),
(22, 12, 39, 0, '2026-06-01 16:38:51'),
(23, 12, 40, 1, '2026-06-01 16:39:12'),
(24, 14, 48, 0, '2026-08-10 15:27:05');

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `prescription_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `pharmacist_notes` text DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `prescriptions`
--

INSERT INTO `prescriptions` (`prescription_id`, `patient_id`, `pharmacy_id`, `file_path`, `notes`, `status`, `pharmacist_notes`, `verified_by`, `uploaded_at`) VALUES
(8, 26, 10, 'uploads/prescriptions/rx_26_1780851147.png', '', 'pending', NULL, NULL, '2026-06-07 16:52:27'),
(9, 26, 11, 'uploads/prescriptions/rx_26_1780855500.png', '', 'pending', NULL, NULL, '2026-06-07 18:05:00');

-- --------------------------------------------------------

--
-- Table structure for table `reminders`
--

CREATE TABLE `reminders` (
  `reminder_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `medicine_name` varchar(200) NOT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `reminder_time` time NOT NULL,
  `end_date` date DEFAULT NULL,
  `frequency` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reminders`
--

INSERT INTO `reminders` (`reminder_id`, `patient_id`, `medicine_name`, `dosage`, `reminder_time`, `end_date`, `frequency`, `is_active`, `created_at`) VALUES
(1, 26, 'Custom Reminder', NULL, '08:00:00', '2026-06-15', 'Every 12 hours', 1, '2026-06-06 19:02:37'),
(2, 26, 'Custom Reminder', NULL, '08:00:00', NULL, 'Every 24 hours', 1, '2026-06-06 19:05:17');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `reservation_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `pharmacy_id` int(11) NOT NULL,
  `assigned_pharmacist_id` int(11) DEFAULT NULL,
  `prescription_url` varchar(255) DEFAULT NULL,
  `status` enum('pending','quoted','reserved','completed','rejected','bill_generated','pending_pickup','paid','claimed') DEFAULT 'pending',
  `payment_status` enum('pending','half_paid','paid') DEFAULT 'pending',
  `pickup_pin` varchar(4) DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `pharmacist_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`reservation_id`, `patient_id`, `pharmacy_id`, `assigned_pharmacist_id`, `prescription_url`, `status`, `payment_status`, `pickup_pin`, `total_amount`, `amount_paid`, `pharmacist_note`, `created_at`) VALUES
(15, 2, 11, NULL, 'uploads/prescriptions/rx_res_26_1780385733.png', 'pending', 'pending', NULL, 0.00, 0.00, NULL, '2026-06-02 07:35:33'),
(16, 2, 10, 8, 'uploads/prescriptions/rx_res_26_1780397802.pdf', 'bill_generated', 'pending', NULL, 45.00, 0.00, '', '2026-06-02 10:56:42'),
(17, 2, 10, 8, 'uploads/prescriptions/rx_res_26_1780857426.png', 'pending', 'pending', NULL, 0.00, 0.00, NULL, '2026-06-07 18:37:06'),
(18, 2, 11, NULL, 'uploads/prescriptions/rx_res_26_1780857458.png', 'pending', 'pending', NULL, 0.00, 0.00, NULL, '2026-06-07 18:37:38'),
(19, 2, 10, 8, 'DIRECT_ORDER', 'bill_generated', 'paid', '1454', 3553.00, 7106.00, '', '2026-06-07 18:45:50'),
(20, 2, 10, 8, 'uploads/prescriptions/rx_res_26_1782047134.png', 'paid', 'half_paid', '7867', 675.00, 337.50, '', '2026-06-21 13:05:34'),
(21, 3, 11, 9, 'uploads/prescriptions/rx_res_42_1782215994.png', 'paid', 'paid', '5718', 102.00, 102.00, '', '2026-06-23 11:59:54'),
(22, 3, 11, 9, 'uploads/prescriptions/rx_res_42_1782218220.png', 'paid', 'paid', '2324', 170.00, 170.00, '', '2026-06-23 12:37:00'),
(23, 3, 10, 8, 'uploads/prescriptions/rx_res_42_1782222439.png', 'completed', 'paid', '0615', 405.00, 405.00, '', '2026-06-23 13:47:19'),
(24, 3, 10, 8, 'uploads/prescriptions/rx_res_42_1782488130.png', 'completed', 'paid', '4379', 135.00, 135.00, '', '2026-06-26 15:35:30'),
(25, 3, 10, 8, 'uploads/prescriptions/rx_res_42_1782576512.png', 'completed', 'paid', '2561', 3553.00, 3553.00, '', '2026-06-27 16:08:32'),
(26, 3, 14, 11, 'uploads/prescriptions/rx_res_42_1786375799.jpg', 'claimed', 'pending', NULL, 0.00, 0.00, 'Verified by pharmacist', '2026-08-10 15:29:59'),
(27, 3, 10, 8, 'uploads/prescriptions/rx_res_42_1786376926.jpg', 'paid', 'paid', '9537', 45.00, 45.00, '', '2026-08-10 15:48:46'),
(28, 3, 10, 8, 'uploads/prescriptions/rx_res_42_1786379625.jpg', 'rejected', 'pending', '7684', 45.00, 0.00, '', '2026-08-10 16:33:45'),
(29, 3, 10, 8, 'uploads/prescriptions/rx_res_42_1786467992.jpg', 'bill_generated', 'pending', '2955', 45.00, 0.00, '', '2026-08-11 17:06:32');

-- --------------------------------------------------------

--
-- Table structure for table `reservation_chats`
--

CREATE TABLE `reservation_chats` (
  `message_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `sender_role` enum('patient','pharmacist') NOT NULL,
  `message_text` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservation_chats`
--

INSERT INTO `reservation_chats` (`message_id`, `reservation_id`, `sender_id`, `sender_role`, `message_text`, `is_read`, `created_at`) VALUES
(41, 15, 26, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-02 07:35:33'),
(42, 16, 26, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: hjk', 1, '2026-06-02 10:56:42'),
(43, 16, 26, 'patient', 'hii', 1, '2026-06-02 10:57:15'),
(44, 16, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-02 10:57:45'),
(45, 16, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 45.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-02 10:57:56'),
(46, 17, 26, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-07 18:37:06'),
(47, 18, 26, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-07 18:37:38'),
(48, 19, 26, 'patient', 'Hello! I placed a direct order for a non-prescription medicine. Please review. Notes: Direct Order: Cetirizine 10mg (Cetirizine Hydrochloride 10mg). sdvfgs', 1, '2026-06-07 18:45:50'),
(49, 19, 26, 'patient', 'aa', 1, '2026-06-07 18:45:57'),
(50, 19, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-07 18:46:21'),
(51, 19, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-07 18:46:35'),
(52, 19, 26, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 3,553.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 3704\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-07 18:52:21'),
(53, 17, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-14 17:09:57'),
(54, 19, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-17 17:27:21'),
(55, 19, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-17 17:33:24'),
(56, 19, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-17 17:33:45'),
(57, 19, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-17 17:42:23'),
(58, 19, 26, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 3,553.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 1454\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-21 13:03:34'),
(59, 20, 26, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-21 13:05:34'),
(60, 20, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-21 13:06:03'),
(61, 20, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 450.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-21 13:06:17'),
(62, 20, 33, 'pharmacist', 'accept it', 1, '2026-06-21 13:06:49'),
(63, 20, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 450.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-21 13:08:45'),
(64, 19, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-21 13:16:11'),
(65, 20, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 675.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-21 13:19:36'),
(66, 20, 26, 'patient', '💳 [ADVANCE PAYMENT SUCCESSFUL]: An advance payment of LKR 337.50 (50%) has been successfully authorized and processed via PayHere Sandbox.\n\n🔑 SECURE PICKUP PIN: 7867\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter. You will need to pay the remaining balance at the pharmacy.', 1, '2026-06-21 14:44:08'),
(68, 21, 37, 'pharmacist', 'Hello! I am pp2, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-23 12:00:56'),
(69, 21, 37, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 102.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-23 12:01:10'),
(70, 21, 42, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 102.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 5718\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-23 12:03:06'),
(71, 22, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-23 12:37:00'),
(72, 22, 37, 'pharmacist', 'Hello! I am pp2, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-23 12:37:17'),
(73, 22, 37, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 170.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-23 12:37:26'),
(74, 22, 42, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 170.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 2324\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-23 12:38:11'),
(75, 23, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-23 13:47:20'),
(76, 23, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-23 13:47:56'),
(77, 23, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 405.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-23 13:48:08'),
(78, 23, 42, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 405.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 0615\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-23 14:15:12'),
(79, 24, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: give me', 1, '2026-06-26 15:35:30'),
(80, 24, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-26 15:36:14'),
(81, 24, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 135.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-26 15:37:20'),
(82, 24, 33, 'pharmacist', 'hii', 1, '2026-06-26 15:37:25'),
(83, 24, 42, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 135.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 4379\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-26 15:41:22'),
(84, 25, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-06-27 16:08:32'),
(85, 25, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-06-27 16:09:18'),
(86, 25, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-27 16:09:26'),
(87, 25, 33, 'pharmacist', '📝 [SYSTEM BILL GENERATED]: A digital bill with an itemized cost breakdown has been compiled and sent. Total price is LKR 3,553.00.\n\nPlease review the details on your dashboard and choose to \'Accept\' or \'Reject\' the bill.', 1, '2026-06-27 16:10:39'),
(88, 25, 42, 'patient', '🚶‍♂️ [SYSTEM MESSAGE]: Patient has opted for \'Direct Pickup\'. The status is now updated to \'pending_pickup\'. The patient is travelling to the pharmacy for pickup.', 1, '2026-06-27 16:20:35'),
(89, 25, 42, 'patient', '💳 [PAYMENT SUCCESSFUL]: Full payment of LKR 3,553.00 has been successfully authorized and processed via PayHere Sandbox. Your reservation status is updated to \'paid\'.\n\n🔑 SECURE PICKUP PIN: 2561\n\nPlease present this 4-digit PIN to the pharmacist when retrieving your medicines at the counter.', 1, '2026-06-27 16:48:15'),
(90, 25, 33, 'pharmacist', '1', 1, '2026-06-28 06:28:04'),
(91, 25, 33, 'pharmacist', 'hh', 1, '2026-06-28 07:07:10'),
(92, 26, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-08-10 15:29:59'),
(93, 27, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-08-10 15:48:46'),
(94, 27, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-08-10 16:33:22'),
(95, 28, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-08-10 16:33:45'),
(96, 28, 33, 'pharmacist', 'Hello! I am pp1, your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!', 1, '2026-08-10 16:33:54'),
(97, 28, 33, 'pharmacist', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋  BILL — City Health Pharmacy\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nReservation #28\nDate: 10 Aug 2026, 06:34 PM\n\nItems:\n  Amlodipine 5mg  x1  —  Rs. 45.00\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal:  LKR 45.00\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease review this bill. If you accept, click \'Confirm Pickup\' — your secure Pickup PIN will be shown only on your screen to present at the pharmacy counter.', 1, '2026-08-10 16:34:28'),
(98, 28, 42, 'patient', '❌ [SYSTEM MESSAGE]: Patient has rejected the digital bill quotation. The reservation status is now updated to \'rejected\'.', 1, '2026-08-10 16:35:38'),
(99, 27, 33, 'pharmacist', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋  BILL — City Health Pharmacy\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nReservation #27\nDate: 10 Aug 2026, 06:37 PM\n\nItems:\n  Amlodipine 5mg  x1  —  Rs. 45.00\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal:  LKR 45.00\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease review this bill. If you accept, click \'Confirm Pickup\' — your secure Pickup PIN will be shown only on your screen to present at the pharmacy counter.', 1, '2026-08-10 16:37:24'),
(100, 29, 42, 'patient', 'Hello! I uploaded my prescription for reservation. Please review and provide a quote. Notes: None', 1, '2026-08-11 17:06:32'),
(101, 27, 42, 'patient', '🚶‍♂️ [SYSTEM MESSAGE]: Patient has opted for \'Direct Pickup\'. The status is now updated to \'pending_pickup\'. The patient is travelling to the pharmacy for pickup.', 1, '2026-08-11 18:06:16'),
(102, 27, 1, 'pharmacist', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ ORDER CONFIRMED — City Health Pharmacy\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOrder #1 (Reservation #27)\nDate: 11 Aug 2026, 08:06 PM\n\nConfirmed Items:\n  Amlodipine 5mg  x1  —  Rs. 45.00\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Amount: LKR 45.00\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔒 Method: Direct Pickup\nYour secure Pickup PIN is shown only on your screen. Please present it verbally at the pharmacy counter.', 1, '2026-08-11 18:06:16'),
(103, 27, 42, 'patient', '🚶‍♂️ [SYSTEM MESSAGE]: Patient has opted for \'Direct Pickup\'. The status is now updated to \'pending_pickup\'. The patient is travelling to the pharmacy for pickup.', 1, '2026-08-11 18:06:40'),
(104, 27, 1, 'pharmacist', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ ORDER CONFIRMED — City Health Pharmacy\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOrder #1 (Reservation #27)\nDate: 11 Aug 2026, 08:06 PM\n\nConfirmed Items:\n  Amlodipine 5mg  x1  —  Rs. 45.00\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Amount: LKR 45.00\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔒 Method: Direct Pickup\nYour secure Pickup PIN is shown only on your screen. Please present it verbally at the pharmacy counter.', 1, '2026-08-11 18:06:40'),
(105, 27, 1, 'pharmacist', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ BILL CONFIRMED — City Health Pharmacy\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOrder #1 (Reservation #27)\nDate: 11 Aug 2026, 08:09 PM\n\nConfirmed Items:\n  Amlodipine 5mg  x1  —  Rs. 45.00\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal Paid/Reserved: LKR 45.00\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔐 Verification PIN: 9537\n\nPlease present this PIN at the pharmacy counter to collect your medicines.', 1, '2026-08-11 18:09:32'),
(106, 29, 33, 'pharmacist', '✅ [SYSTEM MESSAGE]: Your prescription has been approved. We are preparing your bill.', 1, '2026-08-13 16:26:50'),
(107, 29, 33, 'pharmacist', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋  BILL — City Health Pharmacy\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nReservation #29\nDate: 13 Aug 2026, 06:27 PM\n\nItems:\n  Amlodipine 5mg  x1  —  Rs. 45.00\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal:  LKR 45.00\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease review this bill. If you accept, click \'Confirm Pickup\' — your secure Pickup PIN will be shown only on your screen to present at the pharmacy counter.', 1, '2026-08-13 16:27:06');

-- --------------------------------------------------------

--
-- Table structure for table `sos_alerts`
--

CREATE TABLE `sos_alerts` (
  `sos_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('sent','acknowledged','resolved') DEFAULT 'sent',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sos_alerts`
--

INSERT INTO `sos_alerts` (`sos_id`, `patient_id`, `latitude`, `longitude`, `message`, `status`, `created_at`, `resolved_at`) VALUES
(1, 26, -1.26550300, 36.92004400, NULL, 'sent', '2026-06-16 15:46:26', NULL),
(2, 26, -1.26550300, 36.92004400, NULL, 'sent', '2026-06-16 15:46:47', NULL),
(3, 42, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-16 15:49:30', NULL),
(4, 42, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-16 16:05:04', NULL),
(5, 42, 7.00801138, 81.05592728, NULL, 'sent', '2026-06-16 16:15:52', NULL),
(6, 42, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-16 17:15:51', NULL),
(7, 42, 6.99864045, 81.05781555, NULL, 'sent', '2026-06-17 15:28:55', NULL),
(8, 26, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-21 12:44:24', NULL),
(9, 42, 6.98534552, 81.07833500, NULL, 'sent', '2026-06-24 05:53:31', NULL),
(10, 42, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-27 16:52:07', NULL),
(11, 42, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-27 16:54:30', NULL),
(12, 42, 6.98463500, 81.07242600, NULL, 'sent', '2026-06-28 06:41:42', NULL),
(15, 42, 6.98463500, 81.07240300, NULL, 'sent', '2026-08-10 15:28:52', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact_number`, `created_at`) VALUES
(1, 'MedPharm Distributors', '0112345678', '2026-06-03 14:25:02'),
(2, 'Lanka Healthcare Pvt Ltd', '0119876543', '2026-06-03 14:25:02'),
(3, 'Global Pharma Supplies', '0773456789', '2026-06-03 14:25:02'),
(4, 'City Medical Suppliers', '0812345678', '2026-06-03 14:25:02'),
(5, 'Eastern Drug House', '0652345678', '2026-06-03 14:25:02'),
(6, 'a', NULL, '2026-06-03 14:25:19'),
(7, 'MedPharm Distributors', '0112345678', '2026-06-06 05:31:02'),
(8, 'Lanka Healthcare Pvt Ltd', '0119876543', '2026-06-06 05:31:02'),
(9, 'Global Pharma Supplies', '0773456789', '2026-06-06 05:31:02'),
(10, 'City Medical Suppliers', '0812345678', '2026-06-06 05:31:02'),
(11, 'Eastern Drug House', '0652345678', '2026-06-06 05:31:02'),
(12, 'adfasefg', NULL, '2026-06-07 18:45:03');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('superadmin','admin','patient','pharmacy_owner','pharmacist','stock_manager') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `account_status` enum('active','suspended') NOT NULL DEFAULT 'active',
  `profile_image` varchar(500) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `family_contact` varchar(20) DEFAULT NULL,
  `family_relationship` varchar(50) DEFAULT NULL,
  `family_contact_2` varchar(20) DEFAULT NULL,
  `family_relationship_2` varchar(50) DEFAULT NULL,
  `is_sos_enabled` tinyint(1) DEFAULT 0,
  `reset_token` varchar(64) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `account_status`, `profile_image`, `phone`, `birthday`, `age`, `family_contact`, `family_relationship`, `family_contact_2`, `family_relationship_2`, `is_sos_enabled`, `created_at`) VALUES
(1, 'System Administrator', 'admin@medcareassist.lk', '$argon2id$v=19$m=65536,t=4,p=1$T1haMDhiMzN6U1I0YlVRTw$dpP2Qn3vWJ+kGhI6atpyJvyqEqk062LZxrttogokG9U', 'superadmin', 1, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-05-21 11:09:47'),
(26, 'test', 'test@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$QjJhdmNuUGFzbVdxbWgwLw$00JMEeIjioIQPS7XeT/RB+oWMBFmqY7xPDtt7TFln2c', 'patient', 1, 'active', NULL, '12', '2019-02-14', 7, '0769183582', 'Brother', NULL, NULL, 0, '2026-05-23 16:22:15'),
(32, 'p1', 'p1@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$WVFRMDJEU1ZITUdNTXNqRQ$oEzGY/lsjcawK64W7+xGWyUucyCStSFNpWYImgnqan4', 'pharmacy_owner', 1, 'active', NULL, '1234566789', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:10:16'),
(33, 'pp1', 'pp1@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$REh4emxKQnFWZEtKdWtuWA$q1Dn4QDql/Kud46A8rbiL2FGGsH5bX6jlLOi5MDNp3Y', 'pharmacist', 1, 'active', NULL, '478562', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:30:16'),
(34, 'ps1', 'ps1@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$UzJNZ3k1SG1vLjlVYUtaYg$7AH9l8vvUIdUgUX1PDXSzX1putiE4zJESVUNwKOg4t4', 'stock_manager', 1, 'active', NULL, '524856366', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:30:40'),
(35, 'p2', 'p2@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$M3QvSDBId3BTUDAuaXBoZQ$wWthATb/sC5B6fxzV+WHU85zgZceh8rD52EfRXXXVfs', 'pharmacy_owner', 1, 'active', NULL, '14565198', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:32:21'),
(36, 'p3', 'p3@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$QmdkN3d3bGZZR3RFTDl6YQ$Q+0vEVMKKHjiChtCGkClJTdDryX71CGhZqS1pSd36cA', 'pharmacy_owner', 1, 'active', NULL, '54984654', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:33:58'),
(37, 'pp2', 'pp2@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$WW4zUzRVSjlYUUdWYnBpdw$0n5BxSobxXuBb1L067bgTOs+6Gp/tXQevikjgHEbt0k', 'pharmacist', 1, 'active', NULL, '45916', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:37:24'),
(38, 'ps2', 'ps2@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$ZHF3aGNENlVLRXI1TGxxTg$ju4VKOn4hSNYj8ShQ6YwTCHOpmQRfmIJIrCn+Wxm5g8', 'stock_manager', 1, 'active', NULL, '846651651', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:37:53'),
(39, 'pp3', 'pp3@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$UnFLaDlSR2hzL3lLVWoxcQ$hJbLPZrPjMqx8N0/K0tIpfvZbCikCrv2WgIZtctCLtU', 'pharmacist', 1, 'active', NULL, '8646846', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:38:51'),
(40, 'ps3', 'ps3@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$UUZ0NndnL00uR1M1MWNOMA$y2EWn6huMFPKP5AqEcdRXhqlvCIb9aGrgb1TdHr/sAk', 'stock_manager', 1, 'active', NULL, '54651', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-01 16:39:12'),
(41, 'Admin1', 'Admin1@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$YjJ4ZUNpM1Nvc3J1TGR6Rw$SQ6ViFKGg/urRR/pfube9ljzTNqtAmWzXdSmWRPBuUs', 'admin', 1, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-06 14:27:03'),
(42, 'Nipuna Kahawatta', 't1@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$TkQyU1djNlRtOVBmOXlpMg$/JIJnDk1GK0SE3fhL9PFBOnDH4DMuFw2foVGTFb6jJU', 'patient', 1, 'active', NULL, '0752928702', '2005-10-12', 20, '0752928702', 'Mother', '0717573870', 'Mother', 1, '2026-06-16 15:49:10'),
(43, 'jone', 'jone@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$NVhOMDZsZENTRENuQzFSNA$CYv1MB9EONjAlHob1op+pP0i+DYIIKAJI3jTVG3NTNw', 'admin', 1, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-06-28 07:08:42'),
(44, 'Nipuna', 'Nipuna@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$RU96M0NYWnF1dG13d3ZFeg$JTYq5CRvkF7jRdFuanILDI0N95V2uWVOv2vs4faRqhM', 'patient', 1, 'active', NULL, '0752928702', '2003-01-01', 23, '0752928702', 'Father', '0769183582', 'Father', 0, '2026-07-10 07:13:02'),
(45, 'nk', 'maduranga@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$VDg1ZmEzM2dFOWFOQmJ0Yw$+2CaW1HVZSe/hOLMVdmeD73jp1bKY1tFaU+3hWYE/RY', 'patient', 1, 'active', NULL, '0752928702', '2012-01-10', 14, '0752928702', 'Mother', '0769183582', 'Father', 0, '2026-07-10 07:15:46'),
(46, 'Nipuna', 'pp4@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$ZjVsSEdKUzZaZk5OSE5MNQ$CtEJ376PFjApT0o3SYFLMn+tf97aao8koZ+9Kxv8Q5g', 'pharmacy_owner', 1, 'active', NULL, '1234567890', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-08-10 14:39:36'),
(47, 'Nipuna', 'p4@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$WHFZeWpsWUtoNDdieUhMcg$Fg8Yrv6yAGxJroOyM/EkGmAJKMaeDnj00HadC42G+Ns', 'pharmacy_owner', 1, 'active', NULL, '1234567892', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-08-10 15:24:33'),
(48, 'Nipuna', 'pp41@gmail.com', '$argon2id$v=19$m=65536,t=4,p=1$cnNUUTJrVUVsU3NpbjFFLw$bqAqlUBQOxBIggmfoDiYlAcfgKpHH7yNw4Zk5DnguAs', 'pharmacist', 1, 'active', NULL, '123568', NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-08-10 15:27:05');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `digital_prescriptions`
--
ALTER TABLE `digital_prescriptions`
  ADD PRIMARY KEY (`digital_prescription_id`),
  ADD UNIQUE KEY `uq_digital_prescription_reservation` (`reservation_id`),
  ADD KEY `idx_digital_prescription_pharmacist` (`pharmacist_id`);

--
-- Indexes for table `digital_prescription_items`
--
ALTER TABLE `digital_prescription_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_item_digital_prescription` (`digital_prescription_id`),
  ADD KEY `idx_item_medicine` (`medicine_id`);

--
-- Indexes for table `feedbacks`
--
ALTER TABLE `feedbacks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `hospitals`
--
ALTER TABLE `hospitals`
  ADD PRIMARY KEY (`hospital_id`);

--
-- Indexes for table `master_medicines`
--
ALTER TABLE `master_medicines`
  ADD PRIMARY KEY (`medicine_id`);

--
-- Indexes for table `medical_locker`
--
ALTER TABLE `medical_locker`
  ADD PRIMARY KEY (`locker_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `medicine_batches`
--
ALTER TABLE `medicine_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `medicine_id` (`medicine_id`),
  ADD KEY `idx_pharmacy_med_expiry` (`pharmacy_id`,`medicine_id`,`expiry_date`),
  ADD KEY `fk_batch_supplier` (`supplier_id`);

--
-- Indexes for table `medicine_requests`
--
ALTER TABLE `medicine_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `pharmacy_id` (`pharmacy_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `nmra_registry`
--
ALTER TABLE `nmra_registry`
  ADD PRIMARY KEY (`nmra_id`),
  ADD UNIQUE KEY `slmc_number` (`slmc_number`),
  ADD UNIQUE KEY `nmra_reg_number` (`nmra_reg_number`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `pharmacy_id` (`pharmacy_id`),
  ADD KEY `prescription_id` (`prescription_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `medicine_id` (`medicine_id`);

--
-- Indexes for table `order_messages`
--
ALTER TABLE `order_messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`patient_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `pharmacies`
--
ALTER TABLE `pharmacies`
  ADD PRIMARY KEY (`pharmacy_id`),
  ADD UNIQUE KEY `nmra_reg_number` (`nmra_reg_number`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `pharmacists`
--
ALTER TABLE `pharmacists`
  ADD PRIMARY KEY (`pharmacist_id`),
  ADD UNIQUE KEY `slmc_number` (`slmc_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `pharmacy_id` (`pharmacy_id`);

--
-- Indexes for table `pharmacist_details`
--
ALTER TABLE `pharmacist_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `verified_by` (`verified_by`);

--
-- Indexes for table `pharmacy_inventory`
--
ALTER TABLE `pharmacy_inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD UNIQUE KEY `unique_pharmacy_medicine` (`pharmacy_id`,`medicine_id`),
  ADD KEY `medicine_id` (`medicine_id`);

--
-- Indexes for table `pharmacy_staff`
--
ALTER TABLE `pharmacy_staff`
  ADD PRIMARY KEY (`staff_id`),
  ADD UNIQUE KEY `unique_staff` (`pharmacy_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`prescription_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `pharmacy_id` (`pharmacy_id`),
  ADD KEY `verified_by` (`verified_by`);

--
-- Indexes for table `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`reminder_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`reservation_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `pharmacy_id` (`pharmacy_id`),
  ADD KEY `idx_reservations_pharmacist` (`assigned_pharmacist_id`);

--
-- Indexes for table `reservation_chats`
--
ALTER TABLE `reservation_chats`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `idx_chat_reservation` (`reservation_id`),
  ADD KEY `idx_chat_sender` (`sender_id`);

--
-- Indexes for table `sos_alerts`
--
ALTER TABLE `sos_alerts`
  ADD PRIMARY KEY (`sos_id`),
  ADD KEY `fk_sos_patient` (`patient_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_account_status` (`account_status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `digital_prescriptions`
--
ALTER TABLE `digital_prescriptions`
  MODIFY `digital_prescription_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `digital_prescription_items`
--
ALTER TABLE `digital_prescription_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `feedbacks`
--
ALTER TABLE `feedbacks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hospitals`
--
ALTER TABLE `hospitals`
  MODIFY `hospital_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `master_medicines`
--
ALTER TABLE `master_medicines`
  MODIFY `medicine_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `medical_locker`
--
ALTER TABLE `medical_locker`
  MODIFY `locker_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `medicine_batches`
--
ALTER TABLE `medicine_batches`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `medicine_requests`
--
ALTER TABLE `medicine_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nmra_registry`
--
ALTER TABLE `nmra_registry`
  MODIFY `nmra_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `order_messages`
--
ALTER TABLE `order_messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pharmacies`
--
ALTER TABLE `pharmacies`
  MODIFY `pharmacy_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `pharmacists`
--
ALTER TABLE `pharmacists`
  MODIFY `pharmacist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `pharmacist_details`
--
ALTER TABLE `pharmacist_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `pharmacy_inventory`
--
ALTER TABLE `pharmacy_inventory`
  MODIFY `inventory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `pharmacy_staff`
--
ALTER TABLE `pharmacy_staff`
  MODIFY `staff_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `prescriptions`
--
ALTER TABLE `prescriptions`
  MODIFY `prescription_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `reminders`
--
ALTER TABLE `reminders`
  MODIFY `reminder_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `reservation_chats`
--
ALTER TABLE `reservation_chats`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `sos_alerts`
--
ALTER TABLE `sos_alerts`
  MODIFY `sos_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `digital_prescriptions`
--
ALTER TABLE `digital_prescriptions`
  ADD CONSTRAINT `fk_digital_prescription_pharmacist` FOREIGN KEY (`pharmacist_id`) REFERENCES `pharmacists` (`pharmacist_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_digital_prescription_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE CASCADE;

--
-- Constraints for table `digital_prescription_items`
--
ALTER TABLE `digital_prescription_items`
  ADD CONSTRAINT `fk_item_digital_prescription` FOREIGN KEY (`digital_prescription_id`) REFERENCES `digital_prescriptions` (`digital_prescription_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_item_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `master_medicines` (`medicine_id`) ON DELETE CASCADE;

--
-- Constraints for table `medical_locker`
--
ALTER TABLE `medical_locker`
  ADD CONSTRAINT `medical_locker_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `medicine_batches`
--
ALTER TABLE `medicine_batches`
  ADD CONSTRAINT `fk_batch_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `medicine_batches_ibfk_1` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `medicine_batches_ibfk_2` FOREIGN KEY (`medicine_id`) REFERENCES `master_medicines` (`medicine_id`) ON DELETE CASCADE;

--
-- Constraints for table `medicine_requests`
--
ALTER TABLE `medicine_requests`
  ADD CONSTRAINT `medicine_requests_ibfk_1` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `medicine_requests_ibfk_2` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `medicine_requests_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`prescription_id`) ON DELETE SET NULL;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`medicine_id`) REFERENCES `master_medicines` (`medicine_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_messages`
--
ALTER TABLE `order_messages`
  ADD CONSTRAINT `order_messages_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `patients`
--
ALTER TABLE `patients`
  ADD CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `pharmacies`
--
ALTER TABLE `pharmacies`
  ADD CONSTRAINT `pharmacies_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `pharmacists`
--
ALTER TABLE `pharmacists`
  ADD CONSTRAINT `pharmacists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pharmacists_ibfk_2` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE SET NULL;

--
-- Constraints for table `pharmacist_details`
--
ALTER TABLE `pharmacist_details`
  ADD CONSTRAINT `pharmacist_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pharmacist_details_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `pharmacy_inventory`
--
ALTER TABLE `pharmacy_inventory`
  ADD CONSTRAINT `pharmacy_inventory_ibfk_1` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pharmacy_inventory_ibfk_2` FOREIGN KEY (`medicine_id`) REFERENCES `master_medicines` (`medicine_id`) ON DELETE CASCADE;

--
-- Constraints for table `pharmacy_staff`
--
ALTER TABLE `pharmacy_staff`
  ADD CONSTRAINT `pharmacy_staff_ibfk_1` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pharmacy_staff_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `prescriptions_ibfk_2` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `prescriptions_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `reminders`
--
ALTER TABLE `reminders`
  ADD CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `fk_reservations_assigned_pharmacist` FOREIGN KEY (`assigned_pharmacist_id`) REFERENCES `pharmacists` (`pharmacist_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`pharmacy_id`) REFERENCES `pharmacies` (`pharmacy_id`) ON DELETE CASCADE;

--
-- Constraints for table `reservation_chats`
--
ALTER TABLE `reservation_chats`
  ADD CONSTRAINT `fk_chat_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `sos_alerts`
--
ALTER TABLE `sos_alerts`
  ADD CONSTRAINT `fk_sos_patient` FOREIGN KEY (`patient_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- Table structure for table stock_managers
CREATE TABLE stock_managers (
  stock_manager_id int(11) NOT NULL,
  user_id int(11) NOT NULL,
  pharmacy_id int(11) NOT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE stock_managers
  ADD PRIMARY KEY (stock_manager_id),
  ADD KEY user_id (user_id),
  ADD KEY pharmacy_id (pharmacy_id);

ALTER TABLE stock_managers
  MODIFY stock_manager_id int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE stock_managers
  ADD CONSTRAINT stock_managers_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  ADD CONSTRAINT stock_managers_ibfk_2 FOREIGN KEY (pharmacy_id) REFERENCES pharmacies (pharmacy_id) ON DELETE CASCADE;
