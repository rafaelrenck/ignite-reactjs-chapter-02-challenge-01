import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInStock = await api.get(`/stock/${productId}`);

      const alreadyInCart = cart.find(p => p.id === productId);
      
      if (alreadyInCart) {
        const newAmount = alreadyInCart.amount+1;

        if (newAmount > productInStock.data.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const productToUpdate = { ...alreadyInCart, amount: newAmount } as Product;
      
        const newCart = cart.map(p => (p === alreadyInCart ? productToUpdate : p));

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      } else {

        if (productInStock.data.amount <= 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const product = await api.get(`/products/${productId}`);

        const productToAdd = { ...product.data, amount: 1 };

        const newCart = [ ...cart,  productToAdd ] as Product[];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemove = cart.find(product => product.id === productId);

      if (!productToRemove) {
        throw new Error();
      }

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0 ) {
        return;
      }
      const productInStock = await api.get(`/stock/${productId}`);

      const productInCart = cart.find(product => product.id === productId);

      if (productInCart) {
        if (amount > productInStock.data.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const productToUpdate = { ...productInCart, amount } as Product;
      
        const newCart = cart.map(p => (p === productInCart ? productToUpdate : p));

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
