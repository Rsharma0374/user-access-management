package com.guardianservices.userauthentication.objectstorage.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.objectstorage.ObjectStatus;
import com.guardianservices.userauthentication.objectstorage.StoredObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface StoredObjectRepository extends JpaRepository<StoredObject, UUID> {

    List<StoredObject> findByOwnerUser(User ownerUser);

    List<StoredObject> findByOwnerUserAndStatus(User ownerUser, ObjectStatus status);

    Optional<StoredObject> findByQuarantineKey(String quarantineKey);

    Optional<StoredObject> findByCleanKey(String cleanKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM StoredObject o WHERE o.id = :id AND o.ownerUser = :user")
    Optional<StoredObject> findByOwnerAndIdForUpdate(
        @Param("user") User user,
        @Param("id") UUID id
    );

    Optional<StoredObject> findByOwnerUserAndId(User ownerUser, UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM StoredObject o WHERE o.quarantineKey = :key")
    Optional<StoredObject> findByQuarantineKeyForUpdate(@Param("key") String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM StoredObject o WHERE o.cleanKey = :key")
    Optional<StoredObject> findByCleanKeyForUpdate(@Param("key") String key);

    @Query("SELECT o FROM StoredObject o WHERE o.ownerUser = :user AND o.status = :status AND o.id = :objectId")
    Optional<StoredObject> findByOwnerAndStatusAndId(@Param("user") User user, @Param("status") ObjectStatus status, @Param("objectId") UUID objectId);

    @Query("SELECT o FROM StoredObject o WHERE o.expiresAt < :now AND o.status IN ('INITIATED', 'QUARANTINED', 'PROCESSING', 'REJECTED')")
    List<StoredObject> findExpiredObjects(@Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(o) FROM StoredObject o WHERE o.ownerUser = :user AND o.status IN ('INITIATED', 'QUARANTINED', 'PROCESSING')")
    long countActiveUploadsByUser(@Param("user") User user);
}