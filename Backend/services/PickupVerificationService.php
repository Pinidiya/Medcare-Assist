<?php

class PickupVerificationService {
    private $pdo;
    private $userId;

    public function __construct($pdo, $userId) {
        $this->pdo = $pdo;
        $this->userId = $userId;
    }

    public function searchOrder($pin) {
        if (empty($pin)) {
            throw new Exception("PIN is required", 400);
        }

        $pharmacyId = $this->getPharmacyId();
        $pharmacyInfo = $this->getPharmacyInfo($pharmacyId);

        // 1. Search in reservations
        $reservation = $this->searchReservation($pin, $pharmacyId);
        if ($reservation) {
            $reservation['items'] = $this->getReservationItems($reservation['id']);
            $this->appendPharmacyInfo($reservation, $pharmacyInfo);
            return $reservation;
        }

        // 2. Search in orders
        $order = $this->searchDirectOrder($pin, $pharmacyId);
        if ($order) {
            $order['items'] = $this->getOrderItems($order['id']);
            $this->appendPharmacyInfo($order, $pharmacyInfo);
            return $order;
        }

        throw new Exception("No active order found with this PIN.", 200); // 200 so frontend catches json normally
    }

    private function getPharmacyId() {
        $stmt = $this->pdo->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
        $stmt->execute([':uid' => $this->userId]);
        $pharmacist = $stmt->fetch();

        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new Exception("Pharmacy not assigned to this user", 403);
        }
        return $pharmacist['pharmacy_id'];
    }

    private function getPharmacyInfo($pharmacyId) {
        $stmt = $this->pdo->prepare("SELECT pharmacy_name, address, phone FROM pharmacies WHERE pharmacy_id = :phid");
        $stmt->execute([':phid' => $pharmacyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function searchReservation($pin, $pharmacyId) {
        $stmt = $this->pdo->prepare("
            SELECT r.reservation_id AS id, 'reservation' AS type, r.status, r.payment_status, r.total_amount, r.amount_paid,
                   r.pickup_pin, r.created_at,
                   u.full_name AS patient_name, u.email AS patient_email, p.phone_number AS patient_phone
            FROM reservations r
            JOIN patients p ON r.patient_id = p.patient_id
            JOIN users u ON p.user_id = u.user_id
            WHERE r.pickup_pin = :pin AND r.pharmacy_id = :phid AND r.status IN ('paid', 'advance_paid', 'pending_pickup', 'bill_generated')
            LIMIT 1
        ");
        $stmt->execute([':pin' => $pin, ':phid' => $pharmacyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function searchDirectOrder($pin, $pharmacyId) {
        $stmt = $this->pdo->prepare("
            SELECT o.order_id AS id, 'order' AS type, o.status, 'Paid' AS payment_status, o.total_amount, o.total_amount AS amount_paid,
                   o.pickup_pin, o.created_at,
                   u.full_name AS patient_name, u.email AS patient_email, p.phone_number AS patient_phone
            FROM orders o
            JOIN users u ON o.patient_id = u.user_id
            LEFT JOIN patients p ON u.user_id = p.user_id
            WHERE o.pickup_pin = :pin AND o.pharmacy_id = :phid AND o.status = 'Reserved'
            LIMIT 1
        ");
        $stmt->execute([':pin' => $pin, ':phid' => $pharmacyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getReservationItems($reservationId) {
        $stmt = $this->pdo->prepare("
            SELECT dpi.quantity, dpi.unit_price, m.brand_name, m.generic_name, m.requires_prescription,
                   (dpi.quantity * dpi.unit_price) AS line_total
            FROM digital_prescription_items dpi
            JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
            JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
            WHERE dp.reservation_id = :rid
        ");
        $stmt->execute([':rid' => $reservationId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getOrderItems($orderId) {
        $stmt = $this->pdo->prepare("
            SELECT oi.quantity, oi.unit_price, m.brand_name, m.generic_name, m.requires_prescription,
                   (oi.quantity * oi.unit_price) AS line_total
            FROM order_items oi
            JOIN master_medicines m ON oi.medicine_id = m.medicine_id
            WHERE oi.order_id = :oid
        ");
        $stmt->execute([':oid' => $orderId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function appendPharmacyInfo(&$result, $pharmacyInfo) {
        $result['pharmacy_name'] = $pharmacyInfo ? $pharmacyInfo['pharmacy_name'] : 'Pharmacy';
        $result['pharmacy_address'] = $pharmacyInfo ? $pharmacyInfo['address'] : '';
        $result['pharmacy_phone'] = $pharmacyInfo ? $pharmacyInfo['phone'] : '';
    }
}
?>
