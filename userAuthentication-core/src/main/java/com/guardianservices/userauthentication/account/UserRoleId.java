package com.guardianservices.userauthentication.account;

import java.io.Serializable;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode
public class UserRoleId implements Serializable {

    private UUID userId;
    private String roleName;
}