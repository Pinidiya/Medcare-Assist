<?php

require_once __DIR__ . '/../config/ApiException.php';

/**
 * PharmacistService - business logic for the pharmacist module.
 *
 * Encapsulates all data access and business rules for pharmacist
 * operations (reservations, orders, bills, stock, staff, revenue).
 * Controllers stay thin: they parse HTTP input, call a single service
 * method, and serialize the returned payload as JSON.
 *
 * Business-rule failures are signalled with ApiException which carries
 * the HTTP status code that the frontend should receive.
 */
class PharmacistService
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // ─────────────────────────────────────────────────────────────
    // Pharmacist / pharmacy lookup
    // ─────────────────────────────────────────────────────────────

    /**
     * Get the pharmacist + pharmacy linkage for a user ID, or null.
     */
    public function getPharmacistDetails(int $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT pharmacist_id, pharmacy_id FROM pharmacists WHERE user_id = :uid LIMIT 1");
        $stmt->execute([':uid' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Resolve the pharmacy linked to a pharmacist, throwing if none.
     */
    public function requirePharmacyId(int $userId): int
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new ApiException('Pharmacist is not linked to a pharmacy', 400);
        }
        return (int)$pharmacist['pharmacy_id'];
    }

    /**
     * Resolve the pharmacy linked to a pharmacist, or null.
     */
    public function getPharmacyIdOrNull(int $userId): ?int
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            return null;
        }
        return (int)$pharmacist['pharmacy_id'];
    }

    private function getPharmacyInfo(int $pharmacyId): ?array
    {
        $stmt = $this->db->prepare("SELECT pharmacy_name, address, phone FROM pharmacies WHERE pharmacy_id = :phid");
        $stmt->execute([':phid' => $pharmacyId]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);
        return $info ?: null;
    }

    // ─────────────────────────────────────────────────────────────
    // Reservations
    // ─────────────────────────────────────────────────────────────

    /**
     * Get unclaimed pending reservations for a pharmacy.
     */
    public function getPendingReservations(int $pharmacyId): array
    {
        $stmt = $this->db->prepare(
            "SELECT r.reservation_id, r.prescription_url, r.status, r.payment_status,
                    r.total_amount, r.created_at, r.assigned_pharmacist_id,
                    u.full_name AS patient_name, u.email AS patient_email, p.phone_number AS patient_phone
             FROM reservations r
             JOIN patients p ON r.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.user_id
             WHERE r.pharmacy_id = :phid AND r.assigned_pharmacist_id IS NULL AND r.status = 'Pending'
             ORDER BY r.created_at DESC"
        );
        $stmt->execute([':phid' => $pharmacyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get reservations claimed by a specific pharmacist.
     */
    public function getClaimedReservations(int $pharmacyId, int $pharmacistId): array
    {
        $stmt = $this->db->prepare(
            "SELECT r.reservation_id, r.prescription_url, r.status, r.payment_status,
                    r.total_amount, r.created_at, r.pickup_pin,
                    u.full_name AS patient_name, u.email AS patient_email, p.phone_number AS patient_phone
             FROM reservations r
             JOIN patients p ON r.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.user_id
             WHERE r.pharmacy_id = :phid AND r.assigned_pharmacist_id = :phmid
             ORDER BY r.created_at DESC"
        );
        $stmt->execute([':phid' => $pharmacyId, ':phmid' => $pharmacistId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get reservation details by ID and pharmacy (bill display payload).
     */
    public function getReservationDetails(int $reservationId, int $pharmacyId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT r.reservation_id AS order_id, r.total_amount, r.status, r.payment_status,
                    r.prescription_url, r.pickup_pin, r.pharmacist_note,
                    r.created_at,
                    u.full_name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
                    p_info.phone_number AS patient_phone_alt, p_info.address AS patient_address
             FROM reservations r
             JOIN patients p_info ON r.patient_id = p_info.patient_id
             JOIN users u ON p_info.user_id = u.user_id
             WHERE r.reservation_id = :rid AND r.pharmacy_id = :pid"
        );
        $stmt->execute([':rid' => $reservationId, ':pid' => $pharmacyId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            $dp_stmt = $this->db->prepare(
                "SELECT dp.digital_prescription_id, dp.total_amount AS dp_total
                 FROM digital_prescriptions dp
                 WHERE dp.reservation_id = :rid LIMIT 1"
            );
            $dp_stmt->execute([':rid' => $reservationId]);
            $dp = $dp_stmt->fetch(PDO::FETCH_ASSOC);

            if ($dp) {
                $items_stmt = $this->db->prepare(
                    "SELECT dpi.item_id, dpi.quantity, dpi.unit_price,
                            mm.brand_name, mm.generic_name, mm.category
                     FROM digital_prescription_items dpi
                     JOIN master_medicines mm ON dpi.medicine_id = mm.medicine_id
                     WHERE dpi.digital_prescription_id = :dpid"
                );
                $items_stmt->execute([':dpid' => $dp['digital_prescription_id']]);
                $result['items'] = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $result['items'] = [];
            }

            $statusLower = strtolower($result['status'] ?? '');
            $isProcessedOrBilled = in_array($statusLower, ['bill_generated', 'quoted', 'reserved', 'paid', 'completed', 'pending_pickup', 'claimed']);
            $hasItems = !empty($result['items']);

            $chat_stmt = $this->db->prepare(
                "SELECT 1 FROM reservation_chats WHERE reservation_id = :rid AND message_text LIKE '%[SYSTEM MESSAGE]: Your prescription has been approved%'"
            );
            $chat_stmt->execute([':rid' => $reservationId]);
            $hasApprovedMessage = $chat_stmt->fetch() ? true : false;

            $result['is_approved'] = $isProcessedOrBilled || $hasItems || $hasApprovedMessage;
            $result['is_rejected'] = in_array($statusLower, ['rejected', 'reject']);
            $result['has_bill'] = ($statusLower === 'bill_generated' || $hasItems || in_array($statusLower, ['paid', 'completed', 'reserved', 'pending_pickup', 'quoted']));

            if ($result['is_rejected']) {
                $result['prescription_status'] = 'rejected';
            } elseif ($result['is_approved']) {
                $result['prescription_status'] = $result['has_bill'] ? 'bill_generated' : 'approved';
            } else {
                $result['prescription_status'] = 'pending';
            }
        }

        return $result;
    }

    /**
     * Approve a prescription by posting a system message to the chat.
     */
    public function approveReservation(int $reservationId, int $pharmacistUserId): void
    {
        $pharmacyId = $this->requirePharmacyId($pharmacistUserId);
        $reservation = $this->findReservationForPharmacy($reservationId, $pharmacyId);

        $sys_msg = "✅ [SYSTEM MESSAGE]: Your prescription has been approved. We are preparing your bill.";
        $this->postReservationMessage($reservationId, $pharmacistUserId, $sys_msg);
    }

    /**
     * Reject a reservation (status update + system chat message).
     */
    public function rejectReservation(int $reservationId, int $pharmacistUserId, string $reason = ''): void
    {
        $pharmacyId = $this->requirePharmacyId($pharmacistUserId);
        $reservation = $this->findReservationForPharmacy($reservationId, $pharmacyId, 'reject');

        $blockedStatuses = ['Completed', 'completed', 'rejected', 'Rejected'];
        if (in_array($reservation['status'], $blockedStatuses, true)) {
            throw new ApiException('This reservation cannot be rejected (already ' . $reservation['status'] . ')', 400);
        }

        $this->db->beginTransaction();
        try {
            $up_stmt = $this->db->prepare("UPDATE reservations SET status = 'rejected' WHERE reservation_id = :rid");
            $up_stmt->execute([':rid' => $reservationId]);

            $reasonPart = $reason ? " Reason: {$reason}" : '';
            $sys_msg = "❌ Your prescription reservation has been rejected by the pharmacy.{$reasonPart}";
            $this->postReservationMessage($reservationId, $pharmacistUserId, $sys_msg);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Claim a pending reservation for the given pharmacist.
     */
    public function claimReservation(int $reservationId, int $userId, string $fullName): void
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new ApiException('Pharmacist is not linked to a pharmacy', 400);
        }

        $pharmacistId = (int)$pharmacist['pharmacist_id'];
        $pharmacyId   = (int)$pharmacist['pharmacy_id'];

        $this->db->beginTransaction();
        try {
            $res_stmt = $this->db->prepare(
                "SELECT pharmacy_id, assigned_pharmacist_id, status FROM reservations WHERE reservation_id = :rid FOR UPDATE"
            );
            $res_stmt->execute([':rid' => $reservationId]);
            $reservation = $res_stmt->fetch(PDO::FETCH_ASSOC);

            if (!$reservation) {
                throw new ApiException('Reservation not found', 404);
            }

            if ((int)$reservation['pharmacy_id'] !== $pharmacyId) {
                throw new ApiException('You can only claim reservations belonging to your pharmacy', 403);
            }

            if ($reservation['assigned_pharmacist_id'] !== null) {
                throw new ApiException('This reservation has already been claimed by another pharmacist', 409);
            }

            $up_stmt = $this->db->prepare(
                "UPDATE reservations SET assigned_pharmacist_id = :phmid, status = 'Pending' WHERE reservation_id = :rid"
            );
            $up_stmt->execute([':phmid' => $pharmacistId, ':rid' => $reservationId]);

            $sys_msg = "Hello! I am " . $fullName . ", your assigned pharmacist. I am currently reviewing your prescription and compiling a digital quotation. Let me know if you have any questions!";
            $this->postReservationMessage($reservationId, $userId, $sys_msg);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Orders
    // ─────────────────────────────────────────────────────────────

    /**
     * Get order details by ID and pharmacy (bill display payload).
     */
    public function getOrderDetails(int $orderId, int $pharmacyId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT o.order_id, o.total_amount, o.status, o.notes, o.pickup_pin,
                    o.prescription_id, o.created_at, o.updated_at,
                    u.full_name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
                    p_info.phone_number AS patient_phone_alt, p_info.address AS patient_address
             FROM orders o
             JOIN users u ON o.patient_id = u.user_id
             LEFT JOIN patients p_info ON u.user_id = p_info.user_id
             WHERE o.order_id = :oid AND o.pharmacy_id = :pid"
        );
        $stmt->execute([':oid' => $orderId, ':pid' => $pharmacyId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            if ($result['prescription_id']) {
                $rx_stmt = $this->db->prepare("SELECT file_path FROM prescriptions WHERE prescription_id = :rxid");
                $rx_stmt->execute([':rxid' => $result['prescription_id']]);
                $rx = $rx_stmt->fetch(PDO::FETCH_ASSOC);
                $result['prescription_url'] = $rx ? $rx['file_path'] : null;
            } else {
                $result['prescription_url'] = null;
            }

            $items_stmt = $this->db->prepare(
                "SELECT oi.order_item_id, oi.quantity, oi.unit_price, oi.item_type,
                        mm.brand_name, mm.generic_name, mm.category
                 FROM order_items oi
                 JOIN master_medicines mm ON oi.medicine_id = mm.medicine_id
                 WHERE oi.order_id = :oid"
            );
            $items_stmt->execute([':oid' => $orderId]);
            $result['items'] = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return $result;
    }

    /**
     * List orders (and status counts) for the pharmacist's pharmacy.
     */
    public function getOrders(int $userId, ?string $status): array
    {
        $stmt = $this->db->prepare(
            "SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid AND is_active = 1 LIMIT 1"
        );
        $stmt->execute([':uid' => $userId]);
        $staff = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$staff) {
            return ['data' => [], 'counts' => []];
        }

        $pharmacyId = (int)$staff['pharmacy_id'];

        $sql = "SELECT o.order_id, o.total_amount, o.status, o.notes, o.pickup_pin,
                       o.pharmacist_note, o.advance_payment_slip, o.prescription_id,
                       o.created_at, o.updated_at,
                       u.full_name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
                       COUNT(oi.order_item_id) AS item_count
                FROM orders o
                JOIN users u ON o.patient_id = u.user_id
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                WHERE o.pharmacy_id = :pid";

        $params = [':pid' => $pharmacyId];
        if ($status && in_array($status, ['pending', 'processing', 'ready_for_pickup', 'completed', 'cancelled'], true)) {
            $sql .= " AND o.status = :status";
            $params[':status'] = $status;
        }
        $sql .= " GROUP BY o.order_id ORDER BY o.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cnt_stmt = $this->db->prepare(
            "SELECT status, COUNT(*) as cnt FROM orders WHERE pharmacy_id = :pid GROUP BY status"
        );
        $cnt_stmt->execute([':pid' => $pharmacyId]);
        $counts = [];
        while ($row = $cnt_stmt->fetch(PDO::FETCH_ASSOC)) {
            $counts[$row['status']] = (int)$row['cnt'];
        }

        return ['data' => $orders, 'counts' => $counts];
    }

    /**
     * Combined order + reservation history for the pharmacist's pharmacy.
     */
    public function getOrderHistory(int $userId, ?string $dateFrom, ?string $dateTo): array
    {
        $pharmacyId = $this->getPharmacyIdOrNull($userId);
        if ($pharmacyId === null) {
            return [];
        }

        $history = [];

        $sqlOrders = "
            SELECT o.order_id, o.total_amount, o.status, o.created_at, o.updated_at,
                   u.full_name AS patient_name, u.email AS patient_email, p_info.phone_number AS patient_phone,
                   'order' as type,
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) AS item_count
            FROM orders o
            JOIN users u ON o.patient_id = u.user_id
            LEFT JOIN patients p_info ON u.user_id = p_info.user_id
            WHERE o.pharmacy_id = :pid";
        $params = [':pid' => $pharmacyId];
        if ($dateFrom && $dateTo) {
            $sqlOrders .= " AND DATE(o.updated_at) BETWEEN :date_from AND :date_to";
            $params[':date_from'] = $dateFrom;
            $params[':date_to'] = $dateTo;
        }
        $sqlOrders .= " ORDER BY o.updated_at DESC";

        $stmt = $this->db->prepare($sqlOrders);
        $stmt->execute($params);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $row['display_status'] = $this->normalizeDisplayStatus($row['status']);
            $history[] = $row;
        }

        $sqlRes = "
            SELECT r.reservation_id AS order_id, r.total_amount, r.status, r.created_at, r.created_at AS updated_at,
                   u.full_name AS patient_name, u.email AS patient_email, p_info.phone_number AS patient_phone,
                   'reservation' as type,
                   (SELECT COUNT(*) FROM digital_prescription_items dpi
                    JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
                    WHERE dp.reservation_id = r.reservation_id) AS item_count
            FROM reservations r
            JOIN patients p_info ON r.patient_id = p_info.patient_id
            JOIN users u ON p_info.user_id = u.user_id
            WHERE r.pharmacy_id = :pid";
        if ($dateFrom && $dateTo) {
            $sqlRes .= " AND DATE(r.created_at) BETWEEN :date_from AND :date_to";
        }
        $sqlRes .= " ORDER BY r.created_at DESC";

        $stmt = $this->db->prepare($sqlRes);
        $stmt->execute($params);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $row['display_status'] = $this->normalizeDisplayStatus($row['status']);
            $history[] = $row;
        }

        usort($history, static function (array $a, array $b): int {
            return strtotime($b['updated_at']) - strtotime($a['updated_at']);
        });

        return $history;
    }

    /**
     * Create/replace the quotation (items + Quoted status) for an order.
     */
    public function createOrderQuotation(int $orderId, array $items): float
    {
        $this->db->beginTransaction();
        try {
            $delStmt = $this->db->prepare("DELETE FROM order_items WHERE order_id = :oid");
            $delStmt->execute([':oid' => $orderId]);

            $totalAmount = 0.0;
            $insertStmt = $this->db->prepare(
                "INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, item_type)
                 VALUES (:oid, :mid, :qty, :price, :type)"
            );

            foreach ($items as $item) {
                $mid   = (int)$item['medicine_id'];
                $qty   = (int)$item['quantity'];
                $price = (float)$item['unit_price'];
                $type  = isset($item['item_type']) && in_array($item['item_type'], ['prescribed', 'manual_otc'], true)
                    ? $item['item_type']
                    : 'prescribed';

                $totalAmount += ($qty * $price);

                $insertStmt->execute([
                    ':oid'   => $orderId,
                    ':mid'   => $mid,
                    ':qty'   => $qty,
                    ':price' => $price,
                    ':type'  => $type,
                ]);
            }

            $updateStmt = $this->db->prepare(
                "UPDATE orders SET status = 'Quoted', total_amount = :total WHERE order_id = :oid"
            );
            $updateStmt->execute([':total' => $totalAmount, ':oid' => $orderId]);

            $this->db->commit();
            return $totalAmount;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Update a single order status.
     */
    public function updateOrderStatus(int $orderId, string $status): void
    {
        $stmt = $this->db->prepare("UPDATE orders SET status = :status WHERE order_id = :id");
        $stmt->execute([':status' => $status, ':id' => $orderId]);
    }

    // ─────────────────────────────────────────────────────────────
    // Billing / digital prescriptions
    // ─────────────────────────────────────────────────────────────

    /**
     * Generate (replace) a digital prescription + quotation for a reservation.
     */
    public function generateDigitalPrescription(int $userId, int $reservationId, array $items): array
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new ApiException('Pharmacist is not linked to a pharmacy', 400);
        }

        $pharmacistId = (int)$pharmacist['pharmacist_id'];
        $pharmacyId   = (int)$pharmacist['pharmacy_id'];

        [$totalAmount, $validatedItems] = $this->validateBillItems($items);

        $this->db->beginTransaction();
        try {
            $reservation = $this->lockReservation($reservationId, $pharmacyId, $pharmacistId);

            $this->deleteDigitalPrescriptions($reservationId);

            $digitalPrescriptionId = $this->insertDigitalPrescription($reservationId, $pharmacistId, $totalAmount, $validatedItems);

            $formattedTotal = number_format($totalAmount, 2, '.', ',');
            $sysMsg = "📝 [SYSTEM QUOTATION]: A digital prescription with an itemized cost breakdown has been compiled and sent. Total price is LKR {$formattedTotal}. Please review the breakdown and click 'Pay & Reserve' to proceed to checkout.";
            $this->postReservationMessage($reservationId, $userId, $sysMsg);

            $this->db->commit();

            return [
                'digital_prescription_id' => $digitalPrescriptionId,
                'total_amount'            => $totalAmount,
            ];
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Generate a bill for a reservation (status -> bill_generated).
     */
    public function generateReservationBill(int $userId, int $reservationId, array $items, ?string $pharmacistNote): array
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new ApiException('Pharmacist is not linked to a pharmacy', 400);
        }

        $pharmacistId = (int)$pharmacist['pharmacist_id'];
        $pharmacyId   = (int)$pharmacist['pharmacy_id'];

        [$totalAmount, $validatedItems] = $this->validateBillItems($items);

        $this->db->beginTransaction();
        try {
            $this->lockReservation($reservationId, $pharmacyId, $pharmacistId);

            $this->deleteDigitalPrescriptions($reservationId);

            $digitalPrescriptionId = $this->insertDigitalPrescription($reservationId, $pharmacistId, $totalAmount, $validatedItems);

            $pharmacyName = $this->getPharmacyName($pharmacyId);
            $pickupPin    = $this->generatePin(4);

            $upRes = $this->db->prepare(
                "UPDATE reservations SET total_amount = :total, status = 'bill_generated', pharmacist_note = :note, pickup_pin = :pin WHERE reservation_id = :rid"
            );
            $upRes->execute([
                ':total' => $totalAmount,
                ':note'  => $pharmacistNote,
                ':pin'   => $pickupPin,
                ':rid'   => $reservationId,
            ]);

            $this->savePickupPinAudit($reservationId, $pharmacyId, $pickupPin, $totalAmount, $userId);

            $itemsText = $this->formatBillItems($validatedItems);
            $noteLine  = $pharmacistNote ? "\n📝 Note: {$pharmacistNote}\n" : "";
            $formattedTotal = number_format($totalAmount, 2, '.', ',');

            $sysMsg = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                . "📋  BILL — {$pharmacyName}\n"
                . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                . "Reservation #{$reservationId}\n"
                . "Date: " . date('d M Y, h:i A') . "\n\n"
                . "Items:\n{$itemsText}\n"
                . "{$noteLine}\n"
                . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                . "Total:  LKR {$formattedTotal}\n"
                . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                . "Please review this bill. If you accept, click 'Confirm Pickup' — your secure Pickup PIN will be shown only on your screen to present at the pharmacy counter.";

            $this->postReservationMessage($reservationId, $userId, $sysMsg);

            $this->db->commit();

            return [
                'digital_prescription_id' => $digitalPrescriptionId,
                'total_amount'            => $totalAmount,
                // pickup_pin intentionally NOT returned — patient receives it when they confirm pickup
            ];
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Generate a bill for a direct order (status -> Reserved + pickup PIN).
     */
    public function generateOrderBill(int $userId, int $orderId, array $items, ?string $pharmacistNote): array
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new ApiException('Pharmacist is not linked to a pharmacy', 400);
        }

        $pharmacyId = (int)$pharmacist['pharmacy_id'];

        [$totalAmount, $validatedItems] = $this->validateBillItems($items, true);

        $this->db->beginTransaction();
        try {
            $ord_stmt = $this->db->prepare(
                "SELECT order_id, patient_id, pharmacy_id, status FROM orders WHERE order_id = :oid FOR UPDATE"
            );
            $ord_stmt->execute([':oid' => $orderId]);
            $order = $ord_stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                throw new ApiException('Order not found', 404);
            }

            if ((int)$order['pharmacy_id'] !== $pharmacyId) {
                throw new ApiException('Order does not belong to your pharmacy', 403);
            }

            $del_stmt = $this->db->prepare("DELETE FROM order_items WHERE order_id = :oid");
            $del_stmt->execute([':oid' => $orderId]);

            $ins_item = $this->db->prepare(
                "INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, item_type)
                 VALUES (:oid, :mid, :qty, :price, :type)"
            );
            foreach ($validatedItems as $vItem) {
                $ins_item->execute([
                    ':oid'   => $orderId,
                    ':mid'   => $vItem['medicine_id'],
                    ':qty'   => $vItem['quantity'],
                    ':price' => $vItem['unit_price'],
                    ':type'  => $vItem['item_type'],
                ]);
            }

            $pharmacyName = $this->getPharmacyName($pharmacyId);
            $pickupPin    = $this->generatePin(4);

            $upOrd = $this->db->prepare(
                "UPDATE orders
                 SET total_amount = :total, status = 'Reserved', pharmacist_note = :note, pickup_pin = :pin
                 WHERE order_id = :oid"
            );
            $upOrd->execute([
                ':total' => $totalAmount,
                ':note'  => $pharmacistNote,
                ':pin'   => $pickupPin,
                ':oid'   => $orderId,
            ]);

            $this->savePickupPinAudit(0, $pharmacyId, $pickupPin, $totalAmount, $userId);

            $itemsText = $this->formatBillItems($validatedItems);
            $noteLine  = $pharmacistNote ? "\nNote: {$pharmacistNote}\n" : "";
            $formattedTotal = number_format($totalAmount, 2, '.', ',');

            $sysMsg = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                . "BILL — {$pharmacyName}\n"
                . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                . "Order #{$orderId}\n"
                . "Date: " . date('d M Y, h:i A') . "\n\n"
                . "Items:\n{$itemsText}\n"
                . "{$noteLine}\n"
                . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                . "Total:  LKR {$formattedTotal}\n"
                . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                . "Pickup PIN: {$pickupPin}\n\n"
                . "Please review this bill. Share this PIN at the pharmacy counter to collect your order.";

            $this->postOrderMessage($orderId, $sysMsg);

            $this->db->commit();

            return [
                'total_amount' => $totalAmount,
                'pickup_pin'   => $pickupPin,
                'order_id'     => $orderId,
            ];
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Approve or reject an uploaded payment slip for an order.
     */
    public function verifyPayment(int $orderId, string $action): array
    {
        $pin         = null;
        $newStatus   = 'Rejected';
        $billMessage = null;
        $totalAmount = 0.0;

        $this->db->beginTransaction();
        try {
            if ($action === 'approve') {
                $pin = $this->generatePin(4);
                $newStatus = 'Reserved';

                $item_stmt = $this->db->prepare(
                    "SELECT oi.quantity, oi.unit_price, m.brand_name
                     FROM order_items oi
                     JOIN master_medicines m ON oi.medicine_id = m.medicine_id
                     WHERE oi.order_id = :oid"
                );
                $item_stmt->execute([':oid' => $orderId]);
                $orderItems = $item_stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($orderItems as $item) {
                    $totalAmount += $item['quantity'] * $item['unit_price'];
                }

                $ord_stmt = $this->db->prepare(
                    "SELECT o.pharmacy_id, ph.pharmacy_name
                     FROM orders o
                     JOIN pharmacies ph ON o.pharmacy_id = ph.pharmacy_id
                     WHERE o.order_id = :oid"
                );
                $ord_stmt->execute([':oid' => $orderId]);
                $orderInfo = $ord_stmt->fetch(PDO::FETCH_ASSOC);
                $pharmacyName = $orderInfo ? $orderInfo['pharmacy_name'] : 'Pharmacy';

                $formattedTotal = number_format($totalAmount, 2, '.', ',');
                $itemsLines = [];
                foreach ($orderItems as $item) {
                    $lineTotal = $item['quantity'] * $item['unit_price'];
                    $itemsLines[] = "  {$item['brand_name']}  x{$item['quantity']}  —  Rs. " . number_format($lineTotal, 2, '.', ',');
                }
                $itemsText = implode("\n", $itemsLines);

                $billMessage = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    . "BILL — {$pharmacyName}\n"
                    . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    . "Order #{$orderId}\n"
                    . "Date: " . date('d M Y, h:i A') . "\n\n"
                    . "Items:\n{$itemsText}\n\n"
                    . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    . "Total:  LKR {$formattedTotal}\n"
                    . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "Pickup PIN: {$pin}\n\n"
                    . "Please share this PIN at the pharmacy counter to collect your order.";
            }

            $stmt = $this->db->prepare(
                "UPDATE orders
                 SET status = :status, pickup_pin = :pin, total_amount = :total
                 WHERE order_id = :oid"
            );
            $stmt->execute([
                ':status' => $newStatus,
                ':pin'    => $pin,
                ':total'  => $totalAmount,
                ':oid'    => $orderId,
            ]);

            if ($action === 'approve' && $billMessage) {
                $this->postOrderMessage($orderId, $billMessage);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        if ($action === 'approve') {
            return [
                'pin'          => $pin,
                'total_amount' => $totalAmount,
            ];
        }

        return [];
    }

    // ─────────────────────────────────────────────────────────────
    // Pickup PIN verification / completion
    // ─────────────────────────────────────────────────────────────

    /**
     * Verify an order's pickup PIN and return the order items + patient.
     */
    public function checkOrderPickupPin(int $orderId, string $pin): array
    {
        $stmt = $this->db->prepare(
            "SELECT o.pickup_pin, o.status, u.full_name, u.email, p.phone_number, p.address
             FROM orders o
             JOIN users u ON o.patient_id = u.user_id
             LEFT JOIN patients p ON u.user_id = p.user_id
             WHERE o.order_id = :oid"
        );
        $stmt->execute([':oid' => $orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new ApiException('Order not found', 404);
        }
        if ($order['status'] !== 'Reserved') {
            throw new ApiException('Order is not in Reserved status', 400);
        }
        if ((string)$order['pickup_pin'] !== (string)$pin) {
            throw new ApiException('Invalid PIN. Verification failed.', 400);
        }

        $itemsStmt = $this->db->prepare(
            "SELECT oi.quantity, m.brand_name, m.generic_name
             FROM order_items oi
             JOIN master_medicines m ON oi.medicine_id = m.medicine_id
             WHERE oi.order_id = :oid"
        );
        $itemsStmt->execute([':oid' => $orderId]);

        return [
            'items'   => $itemsStmt->fetchAll(PDO::FETCH_ASSOC),
            'patient' => [
                'name'    => $order['full_name'],
                'email'   => $order['email'],
                'phone'   => $order['phone_number'] ?? 'N/A',
                'address' => $order['address'] ?? 'N/A',
            ],
        ];
    }

    /**
     * Verify a reservation's pickup PIN and return items + patient.
     */
    public function checkReservationPickupPin(int $reservationId, string $pin): array
    {
        $stmt = $this->db->prepare(
            "SELECT r.pickup_pin, r.status, u.full_name, u.email, p.phone_number, p.address
             FROM reservations r
             JOIN patients p ON r.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.user_id
             WHERE r.reservation_id = :rid"
        );
        $stmt->execute([':rid' => $reservationId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reservation) {
            throw new ApiException('Reservation not found', 404);
        }
        if (!in_array($reservation['status'], ['pending_pickup', 'paid', 'advance_paid'], true)) {
            throw new ApiException('Reservation is not in a valid state for pickup', 400);
        }
        if ((string)$reservation['pickup_pin'] !== (string)$pin) {
            throw new ApiException('Invalid PIN. Verification failed.', 400);
        }

        $itemsStmt = $this->db->prepare(
            "SELECT dpi.quantity, m.brand_name, m.generic_name
             FROM digital_prescription_items dpi
             JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
             JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
             WHERE dp.reservation_id = :rid"
        );
        $itemsStmt->execute([':rid' => $reservationId]);

        return [
            'items'   => $itemsStmt->fetchAll(PDO::FETCH_ASSOC),
            'patient' => [
                'name'    => $reservation['full_name'],
                'email'   => $reservation['email'],
                'phone'   => $reservation['phone_number'] ?? 'N/A',
                'address' => $reservation['address'] ?? 'N/A',
            ],
        ];
    }

    /**
     * Complete an order by verifying its pickup PIN.
     */
    public function verifyOrderPickup(int $orderId, string $pin): void
    {
        $stmt = $this->db->prepare("SELECT pickup_pin, status, notes FROM orders WHERE order_id = :oid");
        $stmt->execute([':oid' => $orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new ApiException('Order not found', 404);
        }
        if ($order['status'] !== 'Reserved') {
            throw new ApiException('Order is not in Reserved status', 400);
        }
        if ((string)$order['pickup_pin'] !== (string)$pin) {
            throw new ApiException('Invalid PIN. Verification failed.', 400);
        }

        $this->db->beginTransaction();
        try {
            $updateStmt = $this->db->prepare("UPDATE orders SET status = 'completed' WHERE order_id = :oid");
            $updateStmt->execute([':oid' => $orderId]);

            if ($order['notes'] && preg_match('/Created from Reservation #(\d+)/', $order['notes'], $matches)) {
                $upRes = $this->db->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid");
                $upRes->execute([':rid' => (int)$matches[1]]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Complete a reservation by verifying its pickup PIN.
     */
    public function verifyReservationPickup(int $reservationId, string $pin): void
    {
        $stmt = $this->db->prepare("SELECT pickup_pin, status FROM reservations WHERE reservation_id = :rid");
        $stmt->execute([':rid' => $reservationId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reservation) {
            throw new ApiException('Reservation not found', 404);
        }
        if (!in_array($reservation['status'], ['pending_pickup', 'paid', 'advance_paid'], true)) {
            throw new ApiException('Reservation is not in a valid state for pickup', 400);
        }
        if ((string)$reservation['pickup_pin'] !== (string)$pin) {
            throw new ApiException('Invalid PIN. Verification failed.', 400);
        }

        $this->db->beginTransaction();
        try {
            $updateStmt = $this->db->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid");
            $updateStmt->execute([':rid' => $reservationId]);

            $linkedNote = "Created from Reservation #" . $reservationId;
            $upOrd = $this->db->prepare("UPDATE orders SET status = 'completed' WHERE notes = :notes");
            $upOrd->execute([':notes' => $linkedNote]);

            $this->tryUpdatePickupPinVerified($reservationId, $pin);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Search orders/reservations by PIN or PayHere ref and optionally complete them.
     */
    public function verifyAndCompleteOrder(int $userId, string $pin, string $action, int $orderId, string $orderType): array
    {
        $pharmacist = $this->getPharmacistDetails($userId);
        if (!$pharmacist || !$pharmacist['pharmacy_id']) {
            throw new ApiException('No pharmacy linked to this account', 403);
        }
        $pharmacyId = (int)$pharmacist['pharmacy_id'];

        // ── ACTION: COMPLETE ─────────────────────────────────────
        if ($action === 'complete') {
            if (!$orderId || $orderType === '') {
                throw new ApiException('order_id and order_type required for completion', 400);
            }

            $this->db->beginTransaction();
            try {
                if ($orderType === 'reservation') {
                    $chk = $this->db->prepare("SELECT pickup_pin, status FROM reservations WHERE reservation_id = :rid AND pharmacy_id = :phid FOR UPDATE");
                    $chk->execute([':rid' => $orderId, ':phid' => $pharmacyId]);
                    $rec = $chk->fetch(PDO::FETCH_ASSOC);
                    if (!$rec) {
                        throw new ApiException('Reservation not found', 400);
                    }
                    if ((string)$rec['pickup_pin'] !== $pin) {
                        throw new ApiException('PIN mismatch — cannot complete', 400);
                    }

                    $this->db->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid")
                        ->execute([':rid' => $orderId]);
                    $this->db->prepare("UPDATE orders SET status = 'completed' WHERE notes = :note AND pharmacy_id = :phid")
                        ->execute([':note' => "Created from Reservation #$orderId", ':phid' => $pharmacyId]);
                } elseif ($orderType === 'order') {
                    $chk = $this->db->prepare("SELECT pickup_pin, status, notes FROM orders WHERE order_id = :oid AND pharmacy_id = :phid FOR UPDATE");
                    $chk->execute([':oid' => $orderId, ':phid' => $pharmacyId]);
                    $rec = $chk->fetch(PDO::FETCH_ASSOC);
                    if (!$rec) {
                        throw new ApiException('Order not found', 400);
                    }
                    if ((string)$rec['pickup_pin'] !== $pin) {
                        throw new ApiException('PIN mismatch — cannot complete', 400);
                    }

                    $this->db->prepare("UPDATE orders SET status = 'completed' WHERE order_id = :oid")
                        ->execute([':oid' => $orderId]);
                    if (preg_match('/Created from Reservation #(\d+)/', $rec['notes'] ?? '', $m)) {
                        $this->db->prepare("UPDATE reservations SET status = 'completed', payment_status = 'paid' WHERE reservation_id = :rid")
                            ->execute([':rid' => (int)$m[1]]);
                    }
                }

                $this->tryMarkPickupPinVerified($orderId, $pin);

                $this->db->commit();
            } catch (Throwable $e) {
                $this->db->rollBack();
                throw $e;
            }

            return ['completed' => true];
        }

        // ── ACTION: SEARCH ───────────────────────────────────────
        $pharmacyInfo = $this->getPharmacyInfo($pharmacyId) ?? [];

        $stmt1 = $this->db->prepare(
            "SELECT r.reservation_id AS id, 'reservation' AS type, r.status, r.payment_status,
                    r.total_amount, r.amount_paid, r.created_at,
                    u.full_name AS patient_name, u.email AS patient_email,
                    COALESCE(p.phone_number, u.phone, '') AS patient_phone
             FROM reservations r
             JOIN patients p ON r.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.user_id
             WHERE r.pickup_pin = :pin AND r.pharmacy_id = :phid
               AND r.status IN ('paid', 'advance_paid', 'pending_pickup', 'bill_generated', 'Reserved')
             LIMIT 1"
        );
        $stmt1->execute([':pin' => $pin, ':phid' => $pharmacyId]);
        $result = $stmt1->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            $items_stmt = $this->db->prepare(
                "SELECT dpi.quantity, dpi.unit_price, m.brand_name, m.generic_name,
                        (dpi.quantity * dpi.unit_price) AS line_total
                 FROM digital_prescription_items dpi
                 JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
                 JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
                 WHERE dp.reservation_id = :rid"
            );
            $items_stmt->execute([':rid' => $result['id']]);
            $result['items'] = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
            $result['pharmacy_name']    = $pharmacyInfo['pharmacy_name'] ?? 'Pharmacy';
            $result['pharmacy_address'] = $pharmacyInfo['address'] ?? '';
            $result['pharmacy_phone']   = $pharmacyInfo['phone'] ?? '';
            unset($result['pickup_pin']);

            return $result;
        }

        $stmt2 = $this->db->prepare(
            "SELECT o.order_id AS id, 'order' AS type, o.status, 'Paid' AS payment_status,
                    o.total_amount, o.total_amount AS amount_paid, o.created_at,
                    u.full_name AS patient_name, u.email AS patient_email,
                    COALESCE(p.phone_number, u.phone, '') AS patient_phone
             FROM orders o
             JOIN users u ON o.patient_id = u.user_id
             LEFT JOIN patients p ON u.user_id = p.user_id
             WHERE o.pickup_pin = :pin AND o.pharmacy_id = :phid
               AND o.status IN ('Reserved', 'pending_pickup', 'Paid')
             LIMIT 1"
        );
        $stmt2->execute([':pin' => $pin, ':phid' => $pharmacyId]);
        $result = $stmt2->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            $items_stmt = $this->db->prepare(
                "SELECT oi.quantity, oi.unit_price, m.brand_name, m.generic_name,
                        (oi.quantity * oi.unit_price) AS line_total
                 FROM order_items oi
                 JOIN master_medicines m ON oi.medicine_id = m.medicine_id
                 WHERE oi.order_id = :oid"
            );
            $items_stmt->execute([':oid' => $result['id']]);
            $result['items'] = $items_stmt->fetchAll(PDO::FETCH_ASSOC);
            $result['pharmacy_name']    = $pharmacyInfo['pharmacy_name'] ?? 'Pharmacy';
            $result['pharmacy_address'] = $pharmacyInfo['address'] ?? '';
            $result['pharmacy_phone']   = $pharmacyInfo['phone'] ?? '';
            unset($result['pickup_pin']);

            return $result;
        }

        try {
            $stmt3 = $this->db->prepare(
                "SELECT py.order_id, py.payhere_ref_id, py.amount, py.status AS payment_status,
                        o.status, o.total_amount, o.created_at, o.pharmacy_id,
                        u.full_name AS patient_name, u.email AS patient_email,
                        COALESCE(p.phone_number, u.phone, '') AS patient_phone
                 FROM payments py
                 JOIN orders o ON py.order_id = o.order_id
                 JOIN users u ON o.patient_id = u.user_id
                 LEFT JOIN patients p ON u.user_id = p.user_id
                 WHERE py.payhere_ref_id = :ref AND o.pharmacy_id = :phid
                   AND o.status NOT IN ('completed', 'cancelled')
                 LIMIT 1"
            );
            $stmt3->execute([':ref' => $pin, ':phid' => $pharmacyId]);
            $payhereResult = $stmt3->fetch(PDO::FETCH_ASSOC);

            if ($payhereResult) {
                $items_stmt = $this->db->prepare(
                    "SELECT oi.quantity, oi.unit_price, m.brand_name, m.generic_name,
                            (oi.quantity * oi.unit_price) AS line_total
                     FROM order_items oi
                     JOIN master_medicines m ON oi.medicine_id = m.medicine_id
                     WHERE oi.order_id = :oid"
                );
                $items_stmt->execute([':oid' => $payhereResult['order_id']]);
                $items = $items_stmt->fetchAll(PDO::FETCH_ASSOC);

                return [
                    'id'               => $payhereResult['order_id'],
                    'type'             => 'order',
                    'status'           => $payhereResult['status'],
                    'payment_status'   => 'online_paid',
                    'total_amount'     => $payhereResult['total_amount'],
                    'created_at'       => $payhereResult['created_at'],
                    'patient_name'     => $payhereResult['patient_name'],
                    'patient_email'    => $payhereResult['patient_email'],
                    'patient_phone'    => $payhereResult['patient_phone'],
                    'payhere_ref'      => $payhereResult['payhere_ref_id'],
                    'items'            => $items,
                    'pharmacy_name'    => $pharmacyInfo['pharmacy_name'] ?? 'Pharmacy',
                    'pharmacy_address' => $pharmacyInfo['address'] ?? '',
                    'pharmacy_phone'   => $pharmacyInfo['phone'] ?? '',
                ];
            }
        } catch (PDOException $e) {
            error_log('PayHere search failed: ' . $e->getMessage());
        }

        throw new ApiException('No active order found with this PIN or reference.', 200);
    }

    /**
     * Unified PIN search used by the pickup verification screen.
     */
    public function searchByPin(int $userId, string $pin): array
    {
        if ($pin === '') {
            throw new ApiException('PIN is required', 400);
        }

        $pharmacyId = $this->requirePharmacyId($userId);
        $pharmacyInfo = $this->getPharmacyInfo($pharmacyId);

        $stmt = $this->db->prepare(
            "SELECT r.reservation_id AS id, 'reservation' AS type, r.status, r.payment_status, r.total_amount, r.amount_paid,
                    r.pickup_pin, r.created_at,
                    u.full_name AS patient_name, u.email AS patient_email, p.phone_number AS patient_phone
             FROM reservations r
             JOIN patients p ON r.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.user_id
             WHERE r.pickup_pin = :pin AND r.pharmacy_id = :phid AND r.status IN ('paid', 'advance_paid', 'pending_pickup', 'bill_generated')
             LIMIT 1"
        );
        $stmt->execute([':pin' => $pin, ':phid' => $pharmacyId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($reservation) {
            $reservation['items'] = $this->getReservationItems($reservation['id']);
            $this->appendPharmacyInfo($reservation, $pharmacyInfo);
            return $reservation;
        }

        $stmt = $this->db->prepare(
            "SELECT o.order_id AS id, 'order' AS type, o.status, 'Paid' AS payment_status, o.total_amount, o.total_amount AS amount_paid,
                    o.pickup_pin, o.created_at,
                    u.full_name AS patient_name, u.email AS patient_email, p.phone_number AS patient_phone
             FROM orders o
             JOIN users u ON o.patient_id = u.user_id
             LEFT JOIN patients p ON u.user_id = p.user_id
             WHERE o.pickup_pin = :pin AND o.pharmacy_id = :phid AND o.status = 'Reserved'
             LIMIT 1"
        );
        $stmt->execute([':pin' => $pin, ':phid' => $pharmacyId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($order) {
            $order['items'] = $this->getOrderItems($order['id']);
            $this->appendPharmacyInfo($order, $pharmacyInfo);
            return $order;
        }

        throw new ApiException('No active order found with this PIN.', 200);
    }

    // ─────────────────────────────────────────────────────────────
    // Prescriptions
    // ─────────────────────────────────────────────────────────────

    /**
     * List prescription reservations (with status counts) for a pharmacy.
     */
    public function getPrescriptions(int $userId, string $role, ?string $statusFilter): array
    {
        $pharmacyId = $this->resolvePharmacyForRole($userId, $role);
        if ($pharmacyId === null) {
            return [
                'data'   => [],
                'counts' => ['pending' => 0, 'verified' => 0, 'rejected' => 0],
                'message' => 'Not linked to any pharmacy',
            ];
        }

        $sql = "SELECT r.reservation_id AS prescription_id, r.prescription_url AS file_path,
                        r.status, '' AS notes, r.pharmacist_note AS pharmacist_notes,
                        r.created_at AS uploaded_at,
                        u.full_name AS patient_name, u.email AS patient_email,
                        p.phone_number AS patient_phone
                 FROM reservations r
                 JOIN patients p ON r.patient_id = p.patient_id
                 JOIN users u ON p.user_id = u.user_id
                 WHERE r.pharmacy_id = :pid AND r.prescription_url IS NOT NULL AND r.prescription_url != ''";

        $params = [':pid' => $pharmacyId];
        if ($statusFilter) {
            if ($statusFilter === 'pending') {
                $sql .= " AND LOWER(r.status) = 'pending'";
            } elseif ($statusFilter === 'verified') {
                $sql .= " AND LOWER(r.status) IN ('claimed', 'approved')";
            } elseif ($statusFilter === 'rejected') {
                $sql .= " AND LOWER(r.status) = 'rejected'";
            }
        }
        $sql .= " ORDER BY r.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $prescriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = "SELECT
            SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as pending_cnt,
            SUM(CASE WHEN LOWER(status) IN ('claimed', 'approved') THEN 1 ELSE 0 END) as verified_cnt,
            SUM(CASE WHEN LOWER(status) = 'rejected' THEN 1 ELSE 0 END) as rejected_cnt
            FROM reservations
            WHERE pharmacy_id = :pid AND prescription_url IS NOT NULL AND prescription_url != ''";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute([':pid' => $pharmacyId]);
        $row = $countStmt->fetch(PDO::FETCH_ASSOC);

        $counts = [
            'pending'  => (int)($row['pending_cnt'] ?? 0),
            'verified' => (int)($row['verified_cnt'] ?? 0),
            'rejected' => (int)($row['rejected_cnt'] ?? 0),
        ];

        foreach ($prescriptions as &$rx) {
            $st = strtolower($rx['status']);
            if ($st === 'pending') {
                $rx['status'] = 'pending';
            } elseif ($st === 'rejected') {
                $rx['status'] = 'rejected';
            } else {
                $rx['status'] = 'verified';
            }
        }
        unset($rx);

        return ['data' => $prescriptions, 'counts' => $counts];
    }

    /**
     * Update a prescription's verification status.
     */
    public function updatePrescriptionStatus(int $userId, string $role, int $prescriptionId, string $status, ?string $notes): void
    {
        $phid = null;
        if ($role === 'pharmacist') {
            $pharmacist = $this->getPharmacistDetails($userId);
            if ($pharmacist) {
                $phid = $pharmacist['pharmacist_id'];
            }
        }

        $updateStatus = ($status === 'verified') ? 'Claimed' : 'Rejected';

        $stmt = $this->db->prepare(
            "UPDATE reservations
             SET status = :status, pharmacist_note = :notes, assigned_pharmacist_id = :phid
             WHERE reservation_id = :id"
        );
        $stmt->execute([
            ':status' => $updateStatus,
            ':notes'  => $notes,
            ':phid'   => $phid,
            ':id'     => $prescriptionId,
        ]);
    }

    /**
     * Delete a prescription reservation.
     */
    public function deletePrescription(int $prescriptionId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM reservations WHERE reservation_id = :id");
        $stmt->execute([':id' => $prescriptionId]);
        return $stmt->rowCount() > 0;
    }

    // ─────────────────────────────────────────────────────────────
    // Staff
    // ─────────────────────────────────────────────────────────────

    /**
     * List pharmacy staff for the pharmacist's pharmacy, or null when the
     * pharmacist is not linked to an active pharmacy.
     */
    public function getStaff(int $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid AND is_active = 1 LIMIT 1");
        $stmt->execute([':uid' => $userId]);
        $pharmacy = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacy) {
            return null;
        }

        $stmt = $this->db->prepare(
            "SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active,
                    ps.staff_id, ps.created_at AS joined_at
             FROM pharmacists ps
             JOIN users u ON ps.user_id = u.user_id
             WHERE ps.pharmacy_id = :pid
             ORDER BY u.role, u.full_name ASC"
        );
        $stmt->execute([':pid' => (int)$pharmacy['pharmacy_id']]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a stock manager account for the pharmacist's pharmacy.
     */
    public function createStaff(int $userId, array $data): array
    {
        $fullName = trim($data['full_name'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $role     = trim($data['role'] ?? '');
        $phone    = trim($data['phone'] ?? '');

        if ($fullName === '' || $email === '' || $password === '' || $role === '' || $phone === '') {
            throw new ApiException('All core fields (name, email, password, role, phone) are required', 400);
        }

        if ($role !== 'stock_manager') {
            throw new ApiException('Pharmacists can only add Stock Managers', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('Invalid email format', 400);
        }

        if (strlen($password) < 6) {
            throw new ApiException('Password must be at least 6 characters', 400);
        }

        $stmt = $this->db->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid AND is_active = 1 LIMIT 1");
        $stmt->execute([':uid' => $userId]);
        $pharmacy = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pharmacy) {
            throw new ApiException('You are not assigned to an active pharmacy.', 403);
        }

        $pharmacyId = $pharmacy['pharmacy_id'];

        $check = $this->db->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
        $check->execute([':email' => $email]);
        if ($check->fetch()) {
            throw new ApiException('Email address already registered', 409);
        }

        $hash = password_hash($password, PASSWORD_ARGON2ID);

        $this->db->beginTransaction();
        try {
            $userStmt = $this->db->prepare(
                "INSERT INTO users (full_name, email, password_hash, role, phone, is_active) VALUES (:name, :email, :hash, :role, :phone, :active)"
            );
            $userStmt->execute([
                ':name'   => $fullName,
                ':email'  => $email,
                ':hash'   => $hash,
                ':role'   => $role,
                ':phone'  => $phone,
                ':active' => 1,
            ]);
            $newUserId = (int)$this->db->lastInsertId();

            $staffStmt = $this->db->prepare(
                "INSERT INTO stock_managers (pharmacy_id, user_id, is_active) VALUES (:pid, :uid, :active)"
            );
            $staffStmt->execute([
                ':pid'    => $pharmacyId,
                ':uid'    => $newUserId,
                ':active' => 1,
            ]);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return ['user_id' => $newUserId, 'is_active' => 1];
    }

    // ─────────────────────────────────────────────────────────────
    // Stock / inventory
    // ─────────────────────────────────────────────────────────────

    /**
     * List medicines available in stock for a pharmacy (aggregated).
     */
    public function getMedicines(int $userId): array
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $query = "
            SELECT
                mb.medicine_id,
                mm.brand_name,
                mm.generic_name,
                mm.category,
                SUM(mb.quantity_in_stock) as total_quantity,
                COALESCE(pi.unit_price, 0) as unit_price
            FROM medicine_batches mb
            JOIN master_medicines mm ON mb.medicine_id = mm.medicine_id
            LEFT JOIN pharmacy_inventory pi ON mb.medicine_id = pi.medicine_id AND mb.pharmacy_id = pi.pharmacy_id
            WHERE mb.pharmacy_id = :phid
              AND mb.quantity_in_stock > 0
            GROUP BY mb.medicine_id
            ORDER BY mm.brand_name ASC
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([':phid' => $pharmacyId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Return the current inventory (one row per medicine) with status.
     */
    public function getStock(int $userId, ?string $search): array
    {
        $pharmacyId = $this->getPharmacyIdOrNull($userId);
        if ($pharmacyId === null) {
            return ['data' => [], 'pharmacy_id' => null];
        }

        $sql = "SELECT
                    pi.inventory_id,
                    pi.medicine_id,
                    pi.stock_quantity       AS quantity,
                    pi.unit_price,
                    pi.expiry_date,
                    pi.low_stock_threshold,
                    pi.updated_at,
                    mm.brand_name,
                    mm.generic_name,
                    mm.category,
                    mm.requires_prescription,
                    (SELECT mb2.batch_number
                     FROM medicine_batches mb2
                     WHERE mb2.medicine_id = pi.medicine_id
                       AND mb2.pharmacy_id = pi.pharmacy_id
                       AND mb2.quantity_in_stock > 0
                     ORDER BY mb2.expiry_date ASC
                     LIMIT 1
                    ) AS batch_number,
                    (SELECT MIN(mb3.expiry_date)
                     FROM medicine_batches mb3
                     WHERE mb3.medicine_id = pi.medicine_id
                       AND mb3.pharmacy_id = pi.pharmacy_id
                       AND mb3.quantity_in_stock > 0
                    ) AS nearest_expiry
                FROM pharmacy_inventory pi
                JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
                WHERE pi.pharmacy_id = :pid";

        $params = [':pid' => $pharmacyId];
        if ($search !== null && $search !== '') {
            $sql .= " AND (mm.brand_name LIKE :s OR mm.generic_name LIKE :s2 OR mm.category LIKE :s3)";
            $like = '%' . $search . '%';
            $params[':s']  = $like;
            $params[':s2'] = $like;
            $params[':s3'] = $like;
        }

        $sql .= " ORDER BY mm.brand_name ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $today = new DateTime();
        $data  = [];

        foreach ($rows as $row) {
            $qty       = (int)$row['quantity'];
            $threshold = (int)($row['low_stock_threshold'] ?? 20);
            $expiry    = $row['nearest_expiry'] ? new DateTime($row['nearest_expiry']) : null;
            $daysLeft  = $expiry ? (int)$today->diff($expiry)->days : 999;
            $isExpired = $expiry && $expiry < $today;

            if ($qty <= 0 || $isExpired) {
                $status = 'out-of-stock';
            } elseif ($daysLeft <= 30) {
                $status = 'expiring-soon';
            } elseif ($qty <= $threshold) {
                $status = $qty <= 5 ? 'critical' : 'low-stock';
            } else {
                $status = 'in-stock';
            }

            $data[] = [
                'medicine_id'           => (int)$row['medicine_id'],
                'brand_name'            => $row['brand_name'],
                'generic_name'          => $row['generic_name'],
                'category'              => $row['category'],
                'requires_prescription' => (bool)$row['requires_prescription'],
                'total_quantity'        => $qty,
                'unit_price'            => (float)$row['unit_price'],
                'nearest_expiry'        => $row['nearest_expiry'],
                'expiry_date'           => $row['nearest_expiry'],
                'batch_number'          => $row['batch_number'] ?? 'N/A',
                'stock_status'          => $status,
                'updated_at'            => $row['updated_at'],
            ];
        }

        return ['data' => $data, 'pharmacy_id' => $pharmacyId];
    }

    /**
     * Search medicines in the pharmacy's inventory.
     */
    public function searchInventory(int $userId, string $query): array
    {
        if ($query === '') {
            return [];
        }

        $pharmacyId = $this->getPharmacyIdOrNull($userId);
        if ($pharmacyId === null) {
            return [];
        }

        $searchTerm = '%' . $query . '%';
        $sql = "SELECT pi.inventory_id, pi.stock_quantity, pi.unit_price, pi.expiry_date,
                       mm.medicine_id, mm.brand_name, mm.generic_name, mm.category, mm.requires_prescription
                FROM pharmacy_inventory pi
                JOIN master_medicines mm ON pi.medicine_id = mm.medicine_id
                WHERE pi.pharmacy_id = :phid
                  AND pi.stock_quantity > 0
                  AND (mm.brand_name LIKE :q1 OR mm.generic_name LIKE :q2)
                ORDER BY mm.brand_name ASC
                LIMIT 30";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':phid' => $pharmacyId,
            ':q1'   => $searchTerm,
            ':q2'   => $searchTerm,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Deduct stock across batches using FEFO, keeping inventory synced.
     */
    public function deductStock(int $userId, array $items): void
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $this->db->beginTransaction();
        try {
            foreach ($items as $item) {
                $medicineId = (int)$item['medicine_id'];
                $requestedQty = (int)$item['requested_quantity'];

                if ($requestedQty <= 0) {
                    continue;
                }

                $batchStmt = $this->db->prepare(
                    "SELECT batch_id, quantity_in_stock
                     FROM medicine_batches
                     WHERE pharmacy_id = :phid
                       AND medicine_id = :mid
                       AND quantity_in_stock > 0
                     ORDER BY expiry_date ASC
                     FOR UPDATE"
                );
                $batchStmt->execute([':phid' => $pharmacyId, ':mid' => $medicineId]);
                $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

                $remainingToDeduct = $requestedQty;

                foreach ($batches as $batch) {
                    if ($remainingToDeduct <= 0) {
                        break;
                    }

                    $batchId = $batch['batch_id'];
                    $availableInBatch = (int)$batch['quantity_in_stock'];

                    if ($availableInBatch <= $remainingToDeduct) {
                        $deductStmt = $this->db->prepare("UPDATE medicine_batches SET quantity_in_stock = 0 WHERE batch_id = :bid");
                        $deductStmt->execute([':bid' => $batchId]);
                        $remainingToDeduct -= $availableInBatch;
                    } else {
                        $deductStmt = $this->db->prepare("UPDATE medicine_batches SET quantity_in_stock = quantity_in_stock - :deduct WHERE batch_id = :bid");
                        $deductStmt->execute([':deduct' => $remainingToDeduct, ':bid' => $batchId]);
                        $remainingToDeduct = 0;
                    }
                }

                if ($remainingToDeduct > 0) {
                    throw new ApiException("Insufficient stock for medicine ID: {$medicineId}. Short by: {$remainingToDeduct}", 400);
                }

                $invUpdate = $this->db->prepare(
                    "UPDATE pharmacy_inventory
                     SET stock_quantity = stock_quantity - :deducted
                     WHERE pharmacy_id = :phid AND medicine_id = :mid"
                );
                $invUpdate->execute([
                    ':deducted' => $requestedQty,
                    ':phid'     => $pharmacyId,
                    ':mid'      => $medicineId,
                ]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Dispense an order by deducting from legacy batches table.
     */
    public function dispenseOrder(int $userId, int $orderId): void
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT medicine_id, quantity FROM order_items WHERE order_id = :oid");
            $stmt->execute([':oid' => $orderId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as $item) {
                $medId = (int)$item['medicine_id'];
                $qtyNeeded = (int)$item['quantity'];

                $batchStmt = $this->db->prepare(
                    "SELECT batch_id, quantity
                     FROM batches
                     WHERE medicine_id = :mid AND pharmacy_id = :phid AND quantity > 0
                     ORDER BY expiry_date ASC"
                );
                $batchStmt->execute([':mid' => $medId, ':phid' => $pharmacyId]);
                $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($batches as $batch) {
                    if ($qtyNeeded <= 0) {
                        break;
                    }

                    if ((int)$batch['quantity'] >= $qtyNeeded) {
                        $newQty = (int)$batch['quantity'] - $qtyNeeded;
                        $updateStmt = $this->db->prepare("UPDATE batches SET quantity = :qty WHERE batch_id = :bid");
                        $updateStmt->execute([':qty' => $newQty, ':bid' => $batch['batch_id']]);
                        $qtyNeeded = 0;
                    } else {
                        $qtyNeeded -= (int)$batch['quantity'];
                        $updateStmt = $this->db->prepare("UPDATE batches SET quantity = 0 WHERE batch_id = :bid");
                        $updateStmt->execute([':bid' => $batch['batch_id']]);
                    }
                }

                if ($qtyNeeded > 0) {
                    throw new ApiException("Insufficient stock for Medicine ID: $medId", 400);
                }
            }

            $completeStmt = $this->db->prepare("UPDATE orders SET status = 'Completed' WHERE order_id = :oid AND pharmacy_id = :phid");
            $completeStmt->execute([':oid' => $orderId, ':phid' => $pharmacyId]);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * CRUD helpers for the legacy batches table.
     */
    public function getBatches(int $userId): array
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $stmt = $this->db->prepare(
            "SELECT b.*, m.brand_name, m.generic_name
             FROM batches b
             JOIN master_medicines m ON b.medicine_id = m.medicine_id
             WHERE b.pharmacy_id = :phid
             ORDER BY b.expiry_date ASC"
        );
        $stmt->execute([':phid' => $pharmacyId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addBatch(int $userId, array $data): void
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $stmt = $this->db->prepare(
            "INSERT INTO batches (medicine_id, pharmacy_id, batch_number, expiry_date, quantity)
             VALUES (:mid, :phid, :bno, :exp, :qty)"
        );
        $stmt->execute([
            ':mid' => $data['medicine_id'],
            ':phid' => $pharmacyId,
            ':bno' => $data['batch_number'],
            ':exp' => $data['expiry_date'],
            ':qty' => $data['quantity'],
        ]);
    }

    public function updateBatch(int $userId, array $data): void
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $stmt = $this->db->prepare("UPDATE batches SET quantity = :qty WHERE batch_id = :bid AND pharmacy_id = :phid");
        $stmt->execute([
            ':qty'  => $data['quantity'],
            ':bid'  => $data['batch_id'],
            ':phid' => $pharmacyId,
        ]);
    }

    public function deleteBatch(int $userId, int $batchId): void
    {
        $pharmacyId = $this->requirePharmacyId($userId);

        $stmt = $this->db->prepare("DELETE FROM batches WHERE batch_id = :bid AND pharmacy_id = :phid");
        $stmt->execute([':bid' => $batchId, ':phid' => $pharmacyId]);
    }

    // ─────────────────────────────────────────────────────────────
    // Revenue
    // ─────────────────────────────────────────────────────────────

    /**
     * Today's revenue + all-time revenue for the pharmacist's pharmacy.
     */
    public function getRevenue(int $userId): array
    {
        $pharmacyId = $this->getPharmacyIdOrNull($userId);
        if ($pharmacyId === null) {
            return [
                'today_revenue' => 0,
                'today_orders'  => 0,
                'total_revenue' => 0,
            ];
        }

        $today = date('Y-m-d');

        $ordersStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS cnt
             FROM orders
             WHERE pharmacy_id = :pid
               AND status IN ('Completed', 'completed', 'Ready for Pickup', 'Billed', 'billed', 'ReadyForPickup')
               AND DATE(created_at) = :today"
        );
        $ordersStmt->execute([':pid' => $pharmacyId, ':today' => $today]);
        $ordersRow = $ordersStmt->fetch(PDO::FETCH_ASSOC);

        $resStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS cnt
             FROM reservations
             WHERE pharmacy_id = :pid
               AND pickup_pin IS NOT NULL
               AND total_amount > 0
               AND DATE(updated_at) = :today"
        );
        $resStmt->execute([':pid' => $pharmacyId, ':today' => $today]);
        $resRow = $resStmt->fetch(PDO::FETCH_ASSOC);

        $totalStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(total_amount), 0) AS revenue
             FROM orders
             WHERE pharmacy_id = :pid AND status IN ('Completed', 'completed')"
        );
        $totalStmt->execute([':pid' => $pharmacyId]);
        $totalOrders = $totalStmt->fetch(PDO::FETCH_ASSOC);

        $totalResStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(total_amount), 0) AS revenue
             FROM reservations
             WHERE pharmacy_id = :pid AND status IN ('Completed', 'completed')"
        );
        $totalResStmt->execute([':pid' => $pharmacyId]);
        $totalRes = $totalResStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'today_revenue' => (float)($ordersRow['revenue'] ?? 0) + (float)($resRow['revenue'] ?? 0),
            'today_orders'  => (int)($ordersRow['cnt'] ?? 0) + (int)($resRow['cnt'] ?? 0),
            'total_revenue' => (float)($totalOrders['revenue'] ?? 0) + (float)($totalRes['revenue'] ?? 0),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────

    private function findReservationForPharmacy(int $reservationId, int $pharmacyId, string $action = 'approve'): array
    {
        $stmt = $this->db->prepare(
            "SELECT pharmacy_id, assigned_pharmacist_id, status FROM reservations WHERE reservation_id = :rid"
        );
        $stmt->execute([':rid' => $reservationId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reservation) {
            throw new ApiException('Reservation not found', 404);
        }

        if ((int)$reservation['pharmacy_id'] !== $pharmacyId) {
            throw new ApiException("You can only {$action} reservations belonging to your pharmacy", 403);
        }

        return $reservation;
    }

    private function lockReservation(int $reservationId, int $pharmacyId, int $pharmacistId): array
    {
        $resStmt = $this->db->prepare(
            "SELECT pharmacy_id, assigned_pharmacist_id, status FROM reservations WHERE reservation_id = :rid FOR UPDATE"
        );
        $resStmt->execute([':rid' => $reservationId]);
        $reservation = $resStmt->fetch(PDO::FETCH_ASSOC);

        if (!$reservation) {
            throw new ApiException('Reservation not found', 404);
        }

        if ((int)$reservation['pharmacy_id'] !== $pharmacyId) {
            throw new ApiException('Reservation does not belong to your pharmacy', 403);
        }

        if ($reservation['assigned_pharmacist_id'] === null || (int)$reservation['assigned_pharmacist_id'] !== $pharmacistId) {
            $assignStmt = $this->db->prepare("UPDATE reservations SET assigned_pharmacist_id = :phmid WHERE reservation_id = :rid");
            $assignStmt->execute([':phmid' => $pharmacistId, ':rid' => $reservationId]);
        }

        return $reservation;
    }

    private function validateBillItems(array $items, bool $withType = false): array
    {
        $totalAmount = 0.0;
        $validatedItems = [];

        foreach ($items as $item) {
            if (!isset($item['medicine_id'], $item['quantity'], $item['unit_price'])) {
                throw new ApiException('Each item must have medicine_id, quantity, and unit_price', 400);
            }

            $medId = (int)$item['medicine_id'];
            $qty   = (int)$item['quantity'];
            $price = (float)$item['unit_price'];

            if ($qty <= 0 || $price < 0) {
                throw new ApiException('Quantity and price must be positive numbers', 400);
            }

            $validated = [
                'medicine_id' => $medId,
                'quantity'    => $qty,
                'unit_price'  => $price,
            ];
            if ($withType) {
                $validated['item_type'] = isset($item['item_type']) && in_array($item['item_type'], ['prescribed', 'manual_otc'], true)
                    ? $item['item_type']
                    : 'prescribed';
            }

            $totalAmount += $qty * $price;
            $validatedItems[] = $validated;
        }

        return [$totalAmount, $validatedItems];
    }

    private function deleteDigitalPrescriptions(int $reservationId): void
    {
        $delStmt = $this->db->prepare("DELETE FROM digital_prescriptions WHERE reservation_id = :rid");
        $delStmt->execute([':rid' => $reservationId]);
    }

    private function insertDigitalPrescription(int $reservationId, int $pharmacistId, float $totalAmount, array $items): int
    {
        $insDp = $this->db->prepare(
            "INSERT INTO digital_prescriptions (reservation_id, pharmacist_id, total_amount, created_at)
             VALUES (:rid, :phmid, :total, NOW())"
        );
        $insDp->execute([
            ':rid'   => $reservationId,
            ':phmid' => $pharmacistId,
            ':total' => $totalAmount,
        ]);
        $digitalPrescriptionId = (int)$this->db->lastInsertId();

        $insItem = $this->db->prepare(
            "INSERT INTO digital_prescription_items (digital_prescription_id, medicine_id, quantity, unit_price)
             VALUES (:dpid, :mid, :qty, :price)"
        );
        foreach ($items as $vItem) {
            $insItem->execute([
                ':dpid'  => $digitalPrescriptionId,
                ':mid'   => $vItem['medicine_id'],
                ':qty'   => $vItem['quantity'],
                ':price' => $vItem['unit_price'],
            ]);
        }

        return $digitalPrescriptionId;
    }

    private function getPharmacyName(int $pharmacyId): string
    {
        $stmt = $this->db->prepare("SELECT pharmacy_name FROM pharmacies WHERE pharmacy_id = :phid");
        $stmt->execute([':phid' => $pharmacyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['pharmacy_name'] : 'Pharmacy';
    }

    private function formatBillItems(array $validatedItems): string
    {
        $lines = [];
        foreach ($validatedItems as $vItem) {
            $medStmt = $this->db->prepare("SELECT brand_name FROM master_medicines WHERE medicine_id = :mid");
            $medStmt->execute([':mid' => $vItem['medicine_id']]);
            $medRow = $medStmt->fetch(PDO::FETCH_ASSOC);
            $medName = $medRow ? $medRow['brand_name'] : 'Medicine #' . $vItem['medicine_id'];
            $lineTotal = $vItem['quantity'] * $vItem['unit_price'];
            $lines[] = "  {$medName}  x{$vItem['quantity']}  —  Rs. " . number_format($lineTotal, 2, '.', ',');
        }
        return implode("\n", $lines);
    }

    private function generatePin(int $digits): string
    {
        return str_pad((string)random_int(10 ** ($digits - 1), (10 ** $digits) - 1), $digits, '0', STR_PAD_LEFT);
    }

    private function savePickupPinAudit(int $reservationId, int $pharmacyId, string $pin, float $totalAmount, int $userId): void
    {
        try {
            $insPin = $this->db->prepare(
                "INSERT INTO pickup_pins (reservation_id, pharmacy_id, pin_code, total_amount, generated_by, created_at)
                 VALUES (:rid, :phid, :pin, :total, :uid, NOW())"
            );
            $insPin->execute([
                ':rid'   => $reservationId,
                ':phid'  => $pharmacyId,
                ':pin'   => $pin,
                ':total' => $totalAmount,
                ':uid'   => $userId,
            ]);
        } catch (PDOException $e) {
            error_log('Failed to save PIN to pickup_pins: ' . $e->getMessage());
        }
    }

    private function tryUpdatePickupPinVerified(int $reservationId, string $pin): void
    {
        try {
            $pinUpdate = $this->db->prepare(
                "UPDATE pickup_pins SET is_verified = 1, verified_at = NOW() WHERE reservation_id = :rid AND pin_code = :pin"
            );
            $pinUpdate->execute([':rid' => $reservationId, ':pin' => $pin]);
        } catch (PDOException $e) {
            error_log('Failed to update pickup_pins: ' . $e->getMessage());
        }
    }

    private function tryMarkPickupPinVerified(int $orderId, string $pin): void
    {
        try {
            $this->db->prepare("UPDATE pickup_pins SET is_verified = 1, verified_at = NOW() WHERE reservation_id = :rid AND pin_code = :pin")
                ->execute([':rid' => $orderId, ':pin' => $pin]);
        } catch (PDOException $e) {
            error_log('Failed to update pickup_pins: ' . $e->getMessage());
        }
    }

    private function postReservationMessage(int $reservationId, int $senderId, string $message): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO reservation_chats (reservation_id, sender_id, sender_role, message_text, created_at)
             VALUES (:rid, :sid, 'pharmacist', :msg, NOW())"
        );
        $stmt->execute([
            ':rid' => $reservationId,
            ':sid' => $senderId,
            ':msg' => $message,
        ]);
    }

    private function postOrderMessage(int $orderId, string $message): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO order_messages (order_id, sender_role, message, created_at)
             VALUES (:oid, 'pharmacist', :msg, NOW())"
        );
        $stmt->execute([':oid' => $orderId, ':msg' => $message]);
    }

    private function normalizeDisplayStatus(string $status): string
    {
        $s = strtolower(trim($status));
        if ($s === 'completed') {
            return 'completed';
        }
        if (in_array($s, ['cancelled', 'rejected', 'cancel'], true)) {
            return 'cancelled';
        }
        if (in_array($s, ['pending', 'pending_pickup', 'bill_generated', 'quoted', 'reserved', 'paid', 'advance_paid'], true)) {
            return 'pending';
        }
        return 'pending';
    }

    private function resolvePharmacyForRole(int $userId, string $role): ?int
    {
        $pharmacyId = null;

        if ($role === 'pharmacy_owner') {
            $stmt = $this->db->prepare("SELECT pharmacy_id FROM pharmacies WHERE owner_id = :uid LIMIT 1");
            $stmt->execute([':uid' => $userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $pharmacyId = $row ? (int)$row['pharmacy_id'] : null;
        } else {
            $pharmacist = $this->getPharmacistDetails($userId);
            if ($pharmacist && $pharmacist['pharmacy_id']) {
                $pharmacyId = (int)$pharmacist['pharmacy_id'];
            } else {
                $stmt = $this->db->prepare("SELECT pharmacy_id FROM pharmacists WHERE user_id = :uid AND is_active = 1 LIMIT 1");
                $stmt->execute([':uid' => $userId]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $pharmacyId = $row ? (int)$row['pharmacy_id'] : null;
            }
        }

        return $pharmacyId;
    }

    private function getReservationItems(int $reservationId): array
    {
        $stmt = $this->db->prepare(
            "SELECT dpi.quantity, dpi.unit_price, m.brand_name, m.generic_name, m.requires_prescription,
                    (dpi.quantity * dpi.unit_price) AS line_total
             FROM digital_prescription_items dpi
             JOIN digital_prescriptions dp ON dpi.digital_prescription_id = dp.digital_prescription_id
             JOIN master_medicines m ON dpi.medicine_id = m.medicine_id
             WHERE dp.reservation_id = :rid"
        );
        $stmt->execute([':rid' => $reservationId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getOrderItems(int $orderId): array
    {
        $stmt = $this->db->prepare(
            "SELECT oi.quantity, oi.unit_price, m.brand_name, m.generic_name, m.requires_prescription,
                    (oi.quantity * oi.unit_price) AS line_total
             FROM order_items oi
             JOIN master_medicines m ON oi.medicine_id = m.medicine_id
             WHERE oi.order_id = :oid"
        );
        $stmt->execute([':oid' => $orderId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function appendPharmacyInfo(array &$result, ?array $pharmacyInfo): void
    {
        $result['pharmacy_name']    = $pharmacyInfo ? $pharmacyInfo['pharmacy_name'] : 'Pharmacy';
        $result['pharmacy_address'] = $pharmacyInfo ? $pharmacyInfo['address'] : '';
        $result['pharmacy_phone']   = $pharmacyInfo ? $pharmacyInfo['phone'] : '';
    }
}

