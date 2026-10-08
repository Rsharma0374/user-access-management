import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import PasswordInput from '../../../components/ui/PasswordInput.jsx';
import Toggle from '../../../components/ui/Toggle.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { createUserSchema, ROLE_OPTIONS } from '../validation/schemas.js';
import { ALL_PRODUCTS } from '../context/ProductContext.jsx';

/**
 * Create User dialog.
 *
 * Collects full name, email, temporary password, product assignment, role and
 * an initial MFA requirement. Product defaults to the active product context
 * (unless "All Products" is selected, in which case the admin must choose).
 *
 * @param {object}   props
 * @param {boolean}  props.open
 * @param {function} props.onClose
 * @param {function} props.onSubmit         async (payload) => void — throws on failure.
 * @param {Product[]} props.products
 * @param {string}   props.activeProduct    Current product context id (or 'all').
 * @param {string}   [props.serverError]
 */
export default function CreateUserModal({
  open,
  onClose,
  onSubmit,
  products = [],
  activeProduct,
  serverError,
}) {
  const defaultProduct =
    activeProduct && activeProduct !== ALL_PRODUCTS ? activeProduct : '';

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      productName: defaultProduct,
      role: 'MEMBER',
      mfaEnabled: false,
    },
  });

  // Reset the form each time the dialog opens, seeding the active product.
  useEffect(() => {
    if (open) {
      reset({
        fullName: '',
        email: '',
        password: '',
        productName: defaultProduct,
        role: 'MEMBER',
        mfaEnabled: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));

  async function submit(values) {
    await onSubmit(values);
  }

  return (
    <Modal open={open} onClose={isSubmitting ? () => {} : onClose} title="Create user" size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="p-6 space-y-5">
        {serverError && <Alert variant="error" message={serverError} />}

        <Input
          id="cu-fullName"
          label="Full name"
          required
          autoComplete="name"
          placeholder="Jane Doe"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          id="cu-email"
          type="email"
          label="Email"
          required
          autoComplete="off"
          placeholder="jane.doe@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <PasswordInput
              id="cu-password"
              label="Temporary password"
              required
              autoComplete="new-password"
              hint="At least 8 characters with upper, lower, number and symbol."
              error={errors.password?.message}
              {...field}
            />
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            id="cu-product"
            label="Product"
            required
            placeholder="Select a product…"
            options={productOptions}
            error={errors.productName?.message}
            {...register('productName')}
          />

          <Select
            id="cu-role"
            label="Role"
            required
            options={ROLE_OPTIONS}
            error={errors.role?.message}
            {...register('role')}
          />
        </div>

        {/* Initial MFA requirement */}
        <Controller
          name="mfaEnabled"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-800">Require MFA</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enable multi-factor authentication for this account from the start.
                </p>
              </div>
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Require MFA for this user"
              />
            </div>
          )}
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            loadingLabel="Creating…"
          >
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
