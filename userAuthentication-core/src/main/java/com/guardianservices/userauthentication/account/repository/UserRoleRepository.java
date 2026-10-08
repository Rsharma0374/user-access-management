package com.guardianservices.userauthentication.account.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.UserRole;
import com.guardianservices.userauthentication.account.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    List<UserRole> findByUser(User user);

    Optional<UserRole> findByUserAndRoleName(User user, String roleName);

    void deleteByUser(User user);

    boolean existsByUserAndRoleName(User user, String roleName);
}